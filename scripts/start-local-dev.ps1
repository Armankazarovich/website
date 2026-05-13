param(
  [int]$Port = 3101,
  [switch]$NoClean,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $Root "tmp\local-dev"
$OutLog = Join-Path $LogDir "next-$Port.log"
$ErrLog = Join-Path $LogDir "next-$Port.err.log"
$Url = "http://localhost:$Port/catalog"

function Stop-ProcessSafe([int]$ProcessId) {
  if ($ProcessId -eq $PID) {
    return
  }

  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
  } catch {
    Write-Host "Could not stop process ${ProcessId}: $($_.Exception.Message)"
  }
}

function Stop-ProjectNodeProcesses {
  $workspace = $Root
  $processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
      $_.ProcessId -ne $PID -and
      $_.CommandLine -like "*$workspace*"
    }

  foreach ($process in $processes) {
    Stop-ProcessSafe -ProcessId $process.ProcessId
  }
}

function Stop-PortListener {
  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-ProcessSafe -ProcessId $listener.OwningProcess
  }
}

function Clear-NextCache {
  if ($NoClean) {
    return
  }

  $nextPath = Join-Path $Root ".next"
  if (-not (Test-Path -LiteralPath $nextPath)) {
    return
  }

  $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
  $resolvedNext = (Resolve-Path -LiteralPath $nextPath).Path
  if (-not $resolvedNext.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove unexpected path: $resolvedNext"
  }

  Remove-Item -LiteralPath $resolvedNext -Recurse -Force
}

function Wait-ForPort {
  for ($i = 0; $i -lt 80; $i++) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($listener) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

Set-Location -LiteralPath $Root
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Remove-Item -LiteralPath $OutLog, $ErrLog -Force -ErrorAction SilentlyContinue

Write-Host "PiloRus local start"
Write-Host "Workspace: $Root"
Write-Host "Port:      $Port"

Stop-ProjectNodeProcesses
Stop-PortListener
Clear-NextCache

$args = @("scripts/next-dev-stable.js", "dev", "-p", "$Port")
Start-Process `
  -FilePath "node.exe" `
  -ArgumentList $args `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog

if (-not (Wait-ForPort)) {
  Write-Host "Next.js did not open port $Port in time."
  Write-Host "Log:   $OutLog"
  Write-Host "Error: $ErrLog"
  exit 1
}

Write-Host "Ready: $Url"
Write-Host "Log:   $OutLog"
Write-Host "Error: $ErrLog"

if (-not $NoOpen) {
  Start-Process $Url
}
