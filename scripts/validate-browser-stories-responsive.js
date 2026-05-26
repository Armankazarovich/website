/* eslint-disable no-console */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "browser-stories-responsive-report.md");
const baseUrl = (process.env.BROWSER_BASE_URL || process.env.RELEASE_BASE_URL || "http://localhost:3101").replace(/\/$/, "");
const testPath = process.env.STORIES_TEST_PATH || "/product/blok-haus-sosna";
const optional = process.argv.includes("--optional");
const startServer = process.argv.includes("--start-server") || process.env.BROWSER_START_SERVER === "1";

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function npmInvocation(commandArgs) {
  if (process.platform !== "win32") return { command: "npm", args: commandArgs };
  return { command: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...commandArgs] };
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

function isLocalBase() {
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function ensureBaseServer() {
  if (await fetchOk(`${baseUrl}/api/health`)) return true;
  if (!startServer || !isLocalBase()) return false;

  const npm = npmInvocation(["run", "dev:3101"]);
  const child = spawn(npm.command, npm.args, {
    cwd: root,
    detached: true,
    stdio: "ignore",
    shell: false,
    windowsHide: true,
  });
  child.unref();

  for (let i = 0; i < 60; i += 1) {
    await sleep(1000);
    if (await fetchOk(`${baseUrl}/api/health`, 4000)) return true;
  }
  return false;
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
      "/Applications/Google Chrome.app/Contents/MOS/Google Chrome",
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
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
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
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP websocket timeout")), 8000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", (event) => {
        clearTimeout(timer);
        reject(new Error(event.message || "CDP websocket error"));
      }, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || "CDP error"));
      else pending.resolve(message.result || {});
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

  async close() {
    try {
      this.ws?.close();
    } catch {}
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

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  for (let i = 0; i < 100; i += 1) {
    const state = await client.evaluate("document.readyState");
    if (state === "complete") break;
    await sleep(100);
  }
}

async function waitForStories(client) {
  for (let i = 0; i < 80; i += 1) {
    const count = await client.evaluate(
      `document.querySelectorAll("[data-store-stories-card],[data-store-stories-side-tab],[data-store-stories-compact-trigger]").length`,
    );
    if (Number(count) > 0) return true;
    await sleep(125);
  }
  return false;
}

async function inspectStories(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    mobile: Boolean(viewport.mobile),
  });
  await navigate(client, `${baseUrl}${testPath}`);
  const present = await waitForStories(client);
  const state = await client.evaluate(`(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        visible: isVisible(element),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const inViewport = (item) => {
      if (!item || !item.visible) return true;
      return item.left >= 0 && item.top >= 0 && item.right <= innerWidth && item.bottom <= innerHeight;
    };
    const card = box("[data-store-stories-card]");
    const side = box("[data-store-stories-side-tab]");
    const compact = box("[data-store-stories-compact-trigger]");
    return {
      url: location.href,
      width: innerWidth,
      height: innerHeight,
      present: Boolean(document.querySelector("[data-store-stories-card],[data-store-stories-side-tab],[data-store-stories-compact-trigger]")),
      card,
      side,
      compact,
      cardInViewport: inViewport(card),
      sideInViewport: inViewport(side),
      compactInViewport: inViewport(compact),
    };
  })()`);
  return { ...state, present };
}

async function main() {
  const serverReady = await ensureBaseServer();
  check("Local server is available", serverReady || optional, `${baseUrl}/api/health must respond before browser stories check.`);
  if (!serverReady) {
    if (optional) return finish();
    throw new Error("Local server is not available");
  }

  const browser = findBrowserExecutable();
  check("Chrome or Edge executable exists", Boolean(browser) || optional, "A Chromium browser is required for responsive story smoke checks.");
  if (!browser) {
    if (optional) return finish();
    throw new Error("Chromium browser was not found");
  }

  const port = 9326;
  const userDataDir = path.join(os.tmpdir(), `pilorus-stories-responsive-${Date.now()}`);
  const child = spawn(browser, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  let client;
  try {
    client = new CdpClient(await waitForDevtools(port));
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const mobile = await inspectStories(client, { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 });
    check(
      "Stories mobile uses compact trigger",
      mobile.present && mobile.compact?.visible && !mobile.card?.visible && !mobile.side?.visible && mobile.compactInViewport,
      `Expected compact trigger only at 390px. State: ${JSON.stringify(mobile)}`,
    );

    const tablet = await inspectStories(client, { width: 900, height: 900, mobile: false, deviceScaleFactor: 1 });
    check(
      "Stories tablet/narrow desktop uses side tab",
      tablet.present && tablet.side?.visible && !tablet.card?.visible && !tablet.compact?.visible && tablet.sideInViewport,
      `Expected side tab only at 900px. State: ${JSON.stringify(tablet)}`,
    );

    const desktop = await inspectStories(client, { width: 1366, height: 900, mobile: false, deviceScaleFactor: 1 });
    check(
      "Stories desktop uses full card inside viewport",
      desktop.present && desktop.card?.visible && !desktop.side?.visible && !desktop.compact?.visible && desktop.cardInViewport,
      `Expected full story card only at 1366px. State: ${JSON.stringify(desktop)}`,
    );
  } finally {
    await client?.close();
    child.kill();
  }

  finish();
}

function finish() {
  const failed = checks.filter((item) => !item.ok);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      "# Browser Stories Responsive Report",
      "",
      `Base URL: ${baseUrl}`,
      `Test path: ${testPath}`,
      "",
      ...checks.map((item) => `- ${item.ok ? "OK" : "FAIL"} ${item.name}: ${item.detail}`),
      "",
    ].join("\n"),
  );

  if (failed.length) {
    console.error(`[ARAY] Browser stories responsive failed (${failed.length}/${checks.length})`);
    for (const item of failed) console.error(`- ${item.name}: ${item.detail}`);
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  console.log(`[ARAY] Browser stories responsive passed (${checks.length} gates)`);
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  console.error(`[ARAY] Browser stories responsive crashed: ${error?.message || error}`);
  process.exit(optional ? 0 : 1);
});
