/* eslint-disable no-console */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "browser-store-mobile-flow-report.md");
const baseUrl = (process.env.BROWSER_BASE_URL || process.env.RELEASE_BASE_URL || "http://localhost:3101").replace(/\/$/, "");
const optional = process.argv.includes("--optional");
const headed = process.argv.includes("--headed");
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
      res.on("data", (chunk) => {
        body += chunk;
      });
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
    await sleep(150);
  }
  await sleep(600);
}

async function waitForCondition(client, expression, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await sleep(200);
  }
  return null;
}

function storeCountExpression(key) {
  return `(() => {
    const raw = localStorage.getItem(${JSON.stringify(key)});
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      const items = parsed?.state?.items ?? parsed?.items ?? [];
      return Array.isArray(items) ? items.length : 0;
    } catch {
      return 0;
    }
  })()`;
}

function firstCartQuantityExpression() {
  return `(() => {
    const raw = localStorage.getItem("pilo-rus-cart");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const items = parsed?.state?.items ?? parsed?.items ?? [];
      return Array.isArray(items) && items[0] ? Number(items[0].quantity) : null;
    } catch {
      return null;
    }
  })()`;
}

async function configureMobile(client) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await client.send("Page.bringToFront");
}

async function tapVisibleSelector(client, selector, label, timeoutMs = 16000) {
  const target = await waitForCondition(
    client,
    `(() => {
      const selector = ${JSON.stringify(selector)};
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const candidates = Array.from(document.querySelectorAll(selector))
        .filter((element) => !element.disabled && isVisible(element));
      if (!candidates.length) return null;
      const element = candidates[0];
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      const x = Math.max(4, Math.min(innerWidth - 4, rect.left + rect.width / 2));
      const y = Math.max(4, Math.min(innerHeight - 4, rect.top + rect.height / 2));
      const top = document.elementFromPoint(x, y);
      const reachable = Boolean(top && (element === top || element.contains(top) || top.closest(selector)));
      return {
        x,
        y,
        reachable,
        text: element.textContent?.trim() || element.getAttribute("aria-label") || "",
        count: candidates.length,
        href: element.getAttribute("href") || "",
      };
    })()`,
    timeoutMs,
  );

  if (!target) {
    check(`${label} target exists`, false, `No visible enabled element for ${selector}`);
    return null;
  }

  if (!target.reachable) {
    check(`${label} target is reachable`, false, `Element exists but center is covered: ${JSON.stringify(target)}`);
    return null;
  }

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: target.x, y: target.y, radiusX: 5, radiusY: 5, force: 1 }],
  });
  await sleep(70);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(450);
  return target;
}

async function clearBuyerStorage(client) {
  await client.evaluate(`(() => {
    localStorage.removeItem("pilo-rus-cart");
    localStorage.removeItem("pilorus-compare");
    localStorage.removeItem("pilorus-wishlist");
    sessionStorage.clear();
    return true;
  })()`);
}

async function runMobileFlow(browserPath) {
  const port = 9400 + Math.floor(Math.random() * 500);
  const profileDir = path.join(os.tmpdir(), `pilorus-mobile-store-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(browserPath, [
    headed ? null : "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-sync",
    "--window-size=390,844",
    process.platform === "linux" ? "--no-sandbox" : null,
    "about:blank",
  ].filter(Boolean), { cwd: root, stdio: "ignore", windowsHide: true });

  let client;
  try {
    client = new CdpClient(await waitForDevtools(port));
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await configureMobile(client);

    await navigate(client, `${baseUrl}/catalog`);
    await clearBuyerStorage(client);
    await navigate(client, `${baseUrl}/catalog?mobile-check=${Date.now()}`);

    const addTarget = await tapVisibleSelector(client, "[data-add-to-cart]:not([disabled])", "Mobile one-tap cart add");
    check(
      "Mobile add-to-cart target is available",
      Boolean(addTarget),
      addTarget ? `Tapped ${addTarget.text || "cart button"} (${addTarget.count} candidates)` : "No add button tapped.",
    );

    const cartCount = await waitForCondition(client, `${storeCountExpression("pilo-rus-cart")} > 0`, 7000);
    check(
      "Mobile cart adds after one tap",
      Boolean(cartCount),
      "A real mobile touch tap must write one cart item without a second tap.",
    );

    await navigate(client, `${baseUrl}/cart`);
    const cartPageHasItem = await waitForCondition(client, `document.querySelectorAll("[data-cart-item]").length > 0`, 12000);
    check("Mobile cart page renders item", Boolean(cartPageHasItem), "Cart page should not fall back to empty state after mobile add.");

    const beforePlus = await client.evaluate(firstCartQuantityExpression());
    const plusTarget = await tapVisibleSelector(client, "[data-cart-qty-plus]", "Mobile cart plus");
    const afterPlus = await waitForCondition(client, `${firstCartQuantityExpression()} > ${Number(beforePlus ?? 0)}`, 7000);
    check(
      "Mobile cart plus changes quantity",
      Boolean(plusTarget && afterPlus),
      `before=${beforePlus}, after=${await client.evaluate(firstCartQuantityExpression())}`,
    );

    const beforeMinus = await client.evaluate(firstCartQuantityExpression());
    const minusTarget = await tapVisibleSelector(client, "[data-cart-qty-minus]", "Mobile cart minus");
    const afterMinus = await waitForCondition(client, `${firstCartQuantityExpression()} < ${Number(beforeMinus ?? 0)}`, 7000);
    check(
      "Mobile cart minus changes quantity",
      Boolean(minusTarget && afterMinus),
      `before=${beforeMinus}, after=${await client.evaluate(firstCartQuantityExpression())}`,
    );

    await navigate(client, `${baseUrl}/catalog?mobile-selection-check=${Date.now()}`);
    const compareTarget = await tapVisibleSelector(client, "[data-store-compare-action]", "Mobile compare");
    const compareCount = await waitForCondition(client, `${storeCountExpression("pilorus-compare")} > 0`, 7000);
    check(
      "Mobile compare saves item",
      Boolean(compareTarget && compareCount),
      compareTarget ? `Tapped ${compareTarget.text || "compare button"}` : "Compare button was not tapped.",
    );

    const wishlistTarget = await tapVisibleSelector(client, "[data-store-wishlist-action]", "Mobile wishlist");
    const wishlistCount = await waitForCondition(client, `${storeCountExpression("pilorus-wishlist")} > 0`, 7000);
    check(
      "Mobile wishlist saves item",
      Boolean(wishlistTarget && wishlistCount),
      wishlistTarget ? `Tapped ${wishlistTarget.text || "wishlist button"}` : "Wishlist button was not tapped.",
    );

    const dockVisible = await waitForCondition(
      client,
      `(() => {
        const element = document.querySelector("[data-store-selection-dock]");
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })()`,
      7000,
    );
    check("Mobile selection dock appears", Boolean(dockVisible), "Compare/wishlist selections should be reachable from the mobile dock.");

    await navigate(client, `${baseUrl}/compare`);
    const comparePageItem = await waitForCondition(client, `document.querySelectorAll("[data-compare-item]").length > 0`, 12000);
    check("Mobile compare page renders saved item", Boolean(comparePageItem), "Saved compare item should survive navigation.");

    await navigate(client, `${baseUrl}/wishlist`);
    const wishlistPageItem = await waitForCondition(client, `document.querySelectorAll("[data-wishlist-item]").length > 0`, 12000);
    check("Mobile wishlist page renders saved item", Boolean(wishlistPageItem), "Saved wishlist item should survive navigation.");
  } finally {
    await client?.close();
    if (!chrome.killed) {
      chrome.kill();
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2500);
        chrome.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    safeRemoveProfile(profileDir);
  }
}

function safeRemoveProfile(profileDir) {
  const tmpRoot = path.resolve(os.tmpdir());
  const resolved = path.resolve(profileDir);
  const allowedPrefix = path.join(tmpRoot, "pilorus-mobile-store-");
  if (!resolved.startsWith(allowedPrefix)) return;
  try {
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {}
}

async function main() {
  const serverReady = await ensureBaseServer();
  check("Base site is reachable", serverReady || optional, `${baseUrl}/api/health`);
  if (!serverReady) {
    if (optional) return finish();
    throw new Error(`Base site is not reachable: ${baseUrl}`);
  }

  const browserPath = findBrowserExecutable();
  check("Chrome or Edge browser is available", Boolean(browserPath) || optional, browserPath || "Set CHROME_PATH to enable browser checks.");
  if (!browserPath) {
    if (optional) return finish();
    throw new Error("No Chrome/Edge executable found for mobile store check.");
  }

  await runMobileFlow(browserPath);
  finish();
}

function finish() {
  const failed = checks.filter((item) => !item.ok);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      "# Browser Store Mobile Flow Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Base URL: ${baseUrl}`,
      "",
      ...checks.map((item) => `- ${item.ok ? "[OK]" : "[FAIL]"} ${item.name}: ${item.detail}`),
      "",
      failed.length ? `Result: FAILED (${failed.length})` : "Result: PASSED",
      "",
    ].join("\n"),
    "utf8",
  );

  if (failed.length && !optional) {
    console.error(`[ARAY] Browser store mobile flow failed (${failed.length}/${checks.length})`);
    for (const item of failed) console.error(`- ${item.name}: ${item.detail}`);
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  if (failed.length) {
    console.warn(`[ARAY] Browser store mobile flow skipped/failed in optional mode (${failed.length} issue(s))`);
  } else {
    console.log(`[ARAY] Browser store mobile flow passed (${checks.length} gates)`);
  }
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  check("Browser store mobile flow runtime", false, error?.message || String(error));
  finish();
});
