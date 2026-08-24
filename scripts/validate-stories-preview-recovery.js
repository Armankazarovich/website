/* eslint-disable no-console */
/*
 * Reproducible regression check for the stories-widget preview fix (PATCH 0.9.1-beta.1,
 * correction commit). Drives a real headless Chromium instance over CDP against an already
 * running local dev server (BROWSER_BASE_URL) and asserts, on real local media files:
 *
 *   1. A preview video error does not cause a repeated automatic mount/GET loop.
 *   2. Switching from video story A to video story B never uses A's preview approval for B.
 *   3. A heavy story B never receives a GET/Range while the widget is closed.
 *
 * This never writes to the database: the two/three test stories are injected purely at the
 * network layer by monkey-patching window.fetch for the `/api/stories` call the widget makes
 * on a product page, so the real dataset is untouched. The test media URLs point at files that
 * already exist in public/ (no uploads, no fixtures written to disk).
 *
 * Does not touch ports 3101/3102 and launches its own isolated Chromium instance.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "stories-preview-recovery-report.md");
const evidenceDir = path.join(root, "docs", "evidence", "stories");
const baseUrl = (process.env.BROWSER_BASE_URL || "http://localhost:3111").replace(/\/$/, "");
const testPath = process.env.STORIES_TEST_PATH || "/product/vagonka-lipa";

// Real, already-existing local files — no fixtures are written.
const LIGHT_VIDEO = "/aray/orb-v2.mp4"; // ~386 KB, under the 12 MB preview threshold
const HEAVY_VIDEO = "/images/production/hero-video.mp4"; // ~69 MB, over the threshold
const HEAD_FAIL_VIDEO = "/images/production/does-not-exist-preview-recovery-check.mp4"; // genuine 404

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}`);
  if (!ok) console.log(`  ${detail}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOk(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function findBrowserExecutable() {
  const candidates = [process.env.CHROME_PATH, process.env.BROWSER_PATH].filter(Boolean);
  if (process.platform === "win32") {
    candidates.push(
      path.join(process.env.ProgramFiles || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env.LocalAppData || "", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env.ProgramFiles || "C:\\Program Files", "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else {
    for (const binary of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]) {
      const result = spawnSync("which", [binary], { encoding: "utf8" });
      if (result.status === 0 && result.stdout.trim()) candidates.push(result.stdout.trim());
    }
  }
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function getJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

function cdpValue(response) {
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Runtime evaluation failed");
  return response.result?.value;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.eventLog = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP websocket timeout")), 8000);
      this.ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener("error", (event) => { clearTimeout(timer); reject(new Error(event.message || "CDP websocket error")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message || "CDP error"));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method) this.eventLog.push(message);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    return cdpValue(await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }));
  }

  networkRequests(urlSubstring) {
    return this.eventLog
      .filter((event) => event.method === "Network.requestWillBeSent" && event.params?.request?.url?.includes(urlSubstring))
      .map((event) => ({ url: event.params.request.url, method: event.params.request.method }));
  }

  clearEventLog() {
    this.eventLog = [];
  }

  async close() {
    try { this.ws?.close(); } catch {}
  }
}

async function waitForDevtools(port, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const pages = await getJson(`http://127.0.0.1:${port}/json/list`, 1500);
      const page = Array.isArray(pages) ? pages.find((item) => item.type === "page") : null;
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

async function navigateAndWaitStories(client, url) {
  await client.send("Page.navigate", { url });
  for (let i = 0; i < 100; i += 1) {
    const state = await client.evaluate("document.readyState");
    if (state === "complete") break;
    await sleep(100);
  }
  for (let i = 0; i < 80; i += 1) {
    const present = await client.evaluate(`Boolean(document.querySelector("[data-store-stories-card]"))`);
    if (present) return true;
    await sleep(125);
  }
  return false;
}

// Injected before every document load in the tab: intercepts only the widget's own
// `/api/stories` fetch and its HEAD probe against HEAD_FAIL_VIDEO. Everything else
// (the real page, the real media files) goes through the real network untouched.
function fetchShimSource() {
  return `(() => {
    const nativeFetch = window.fetch.bind(window);
    const LIGHT = ${JSON.stringify(LIGHT_VIDEO)};
    const HEAVY = ${JSON.stringify(HEAVY_VIDEO)};
    const HEAD_FAIL = ${JSON.stringify(HEAD_FAIL_VIDEO)};
    window.__previewRecoveryCheck = { fetchShimActive: true };
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";
      if (url.includes("/api/stories")) {
        const now = new Date().toISOString();
        const story = (id, title, mediaUrl, sortOrder) => ({
          id, type: "VIDEO", title, subtitle: null, description: null,
          mediaUrl, posterUrl: "/images/production/hero-main.jpg",
          ctaLabel: null, ctaUrl: null, entityType: "product", entityId: "vagonka-lipa",
          placement: "site", pinned: true, sortOrder, views: 0, createdAt: now, relations: [],
        });
        const body = JSON.stringify({
          stories: [
            story("preview-recovery-light", "TEST LIGHT", LIGHT, 1),
            story("preview-recovery-heavy", "TEST HEAVY", HEAVY, 2),
            story("preview-recovery-headfail", "TEST HEAD FAIL", HEAD_FAIL, 3),
          ],
        });
        return Promise.resolve(new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      if (method === "HEAD" && url.includes(HEAD_FAIL)) {
        return Promise.resolve(new Response(null, { status: 404, statusText: "Not Found" }));
      }
      return nativeFetch(input, init);
    };
  })();`;
}

async function clickDot(client, n) {
  await client.evaluate(
    `document.querySelector('[data-store-stories-card] button[aria-label="Сторис ${n}"]')?.click(); true`,
  );
}

async function main() {
  const serverReady = await fetchOk(`${baseUrl}/api/health`);
  check("Local server is available", serverReady, `${baseUrl}/api/health must respond before the recovery check.`);
  if (!serverReady) throw new Error("Local server is not available at " + baseUrl);

  const browser = findBrowserExecutable();
  check("Chrome or Edge executable exists", Boolean(browser), "A Chromium browser is required.");
  if (!browser) throw new Error("Chromium browser was not found");

  const port = 9331;
  const userDataDir = path.join(os.tmpdir(), `pilorus-stories-preview-recovery-${Date.now()}`);
  const child = spawn(browser, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const screenshots = {};
  let client;
  try {
    client = new CdpClient(await waitForDevtools(port));
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchShimSource() });
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

    // --- Scenario setup: navigate, confirm the fetch shim is active, story A (light) approves ---
    const present = await navigateAndWaitStories(client, `${baseUrl}${testPath}`);
    check("Stories widget present on test page", present, `Expected [data-store-stories-card] on ${testPath}`);

    const shimActive = await client.evaluate(`Boolean(window.__previewRecoveryCheck?.fetchShimActive)`);
    check("Test fetch shim is active (no DB writes used)", shimActive, "window.fetch was not patched before app scripts ran.");

    let lightApprovedVideoPresent = false;
    for (let i = 0; i < 40; i += 1) { // poll up to ~4s past STORY_PREVIEW_VIDEO_DELAY_MS (1800ms)
      lightApprovedVideoPresent = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
      if (lightApprovedVideoPresent) break;
      await sleep(100);
    }
    if (!lightApprovedVideoPresent) {
      const debugState = await client.evaluate(`JSON.stringify({
        mediaCount: document.querySelectorAll('[data-store-stories-card] img, [data-store-stories-card] video').length,
        cardHtmlHead: (document.querySelector('[data-store-stories-card]')?.innerHTML || '').slice(0, 400),
      })`);
      console.log(`  debug: ${debugState}`);
      console.log(`  debug: light-video network log: ${JSON.stringify(client.networkRequests(LIGHT_VIDEO))}`);
    }
    check("Story A (light video) preview approved and mounted", lightApprovedVideoPresent, "Expected a <video> for the light story after its HEAD check.");

    const lightGetBefore = client.networkRequests(LIGHT_VIDEO).filter((r) => r.method === "GET").length;
    check("Story A received a real GET for its own file", lightGetBefore > 0, `GET count for ${LIGHT_VIDEO}: ${lightGetBefore}`);

    screenshots.storyA = await client.send("Page.captureScreenshot", { format: "png" });

    // --- Check 1: switching light (A) -> heavy (B) while A is still approved must
    // synchronously invalidate A's permission. Running the error scenario first would
    // revoke A's approval and could let the original stale-boolean bug escape this test.
    client.clearEventLog();
    await clickDot(client, 2); // story index 1 = heavy
    await sleep(50); // check the very next paint, before any HEAD check could possibly resolve

    const heavyVideoImmediatelyAfterSwitch = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
    check("Switching to heavy story B does not reuse A's approval", !heavyVideoImmediatelyAfterSwitch, "A <video> mounted for the heavy story immediately on switch, before any HEAD check could complete.");

    await sleep(2600); // past the HEAD-check delay for story B

    const heavyRequestsAfterDelay = client.networkRequests(HEAVY_VIDEO);
    const heavyGets = heavyRequestsAfterDelay.filter((r) => r.method === "GET");
    check("Closed widget never issues GET/Range for the heavy story", heavyGets.length === 0, `GET/Range requests observed for ${HEAVY_VIDEO}: ${JSON.stringify(heavyGets)}`);

    const heavyVideoStillMounted = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
    check("Heavy story stays on its poster in the closed widget", !heavyVideoStillMounted, "Heavy story's <video> mounted despite exceeding the 12MB preview threshold.");

    screenshots.storyB = await client.send("Page.captureScreenshot", { format: "png" });

    // --- Check 2: preview error must not loop (no repeated auto-mount / auto-GET) ---
    await clickDot(client, 1); // return to light story A and obtain a fresh exact-key approval
    let lightReapprovedVideoPresent = false;
    for (let i = 0; i < 40; i += 1) {
      lightReapprovedVideoPresent = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
      if (lightReapprovedVideoPresent) break;
      await sleep(100);
    }
    check("Story A can be approved again after returning from story B", lightReapprovedVideoPresent, "Expected story A to receive a fresh approval for its own media key.");

    client.clearEventLog();
    await client.evaluate(`document.querySelector('[data-store-stories-card] video')?.dispatchEvent(new Event('error')); true`);
    await sleep(2500); // long enough to catch any re-mount/re-fetch loop if the bug regressed

    const videoAfterError = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
    check("Preview error leaves the poster mounted (no auto re-mount)", !videoAfterError, "A <video> element re-appeared after a preview error without any story/media change.");

    const getsAfterError = client.networkRequests(LIGHT_VIDEO).filter((r) => r.method === "GET").length;
    check("Preview error does not trigger a repeated GET", getsAfterError === 0, `Expected 0 new GET for ${LIGHT_VIDEO} after the error, saw ${getsAfterError}.`);

    screenshots.afterError = await client.send("Page.captureScreenshot", { format: "png" });

    // --- Check 3: HEAD response.ok must gate approval, independent of byte size ---
    client.clearEventLog();
    await clickDot(client, 3); // story index 2 = HEAD_FAIL_VIDEO (genuine 404 on HEAD)
    await sleep(2600);

    const headFailVideoMounted = await client.evaluate(`Boolean(document.querySelector('[data-store-stories-card] video'))`);
    check("A non-ok HEAD response never approves the preview", !headFailVideoMounted, "Video mounted after a 404 HEAD response.");

    const headFailRequests = client.networkRequests(HEAD_FAIL_VIDEO);
    check("Only HEAD (no GET) was attempted against the failing URL", headFailRequests.every((r) => r.method === "HEAD"), `Unexpected requests: ${JSON.stringify(headFailRequests)}`);
  } finally {
    await client?.close();
    child.kill();
  }

  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const [name, result] of Object.entries(screenshots)) {
    if (result?.data) {
      fs.writeFileSync(path.join(evidenceDir, `preview-recovery-${name}.png`), Buffer.from(result.data, "base64"));
    }
  }

  finish();
}

function finish() {
  const failed = checks.filter((item) => !item.ok);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      "# Stories Preview Recovery Report",
      "",
      `Base URL: ${baseUrl}`,
      `Test path: ${testPath}`,
      `Light test file: ${LIGHT_VIDEO}`,
      `Heavy test file: ${HEAVY_VIDEO}`,
      `HEAD-fail test file: ${HEAD_FAIL_VIDEO}`,
      "",
      ...checks.map((item) => `- ${item.ok ? "OK" : "FAIL"} ${item.name}: ${item.detail}`),
      "",
    ].join("\n"),
  );

  if (failed.length) {
    console.error(`[ARAY] Stories preview recovery FAILED (${failed.length}/${checks.length})`);
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  console.log(`[ARAY] Stories preview recovery passed (${checks.length} gates)`);
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  console.error(`[ARAY] Stories preview recovery crashed: ${error?.message || error}`);
  process.exit(1);
});
