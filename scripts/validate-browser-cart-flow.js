/* eslint-disable no-console */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "browser-cart-flow-report.md");
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
  if (process.platform !== "win32") {
    return { command: "npm", args: commandArgs };
  }
  return { command: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...commandArgs] };
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
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
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
  const healthUrl = `${baseUrl}/api/health`;
  if (await fetchOk(healthUrl)) return true;
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
    if (await fetchOk(healthUrl, 4000)) return true;
  }

  return false;
}

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.BROWSER_PATH,
  ].filter(Boolean);

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

function cdpValue(response) {
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "Runtime evaluation failed");
  }
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
      if (message.error) {
        pending.reject(new Error(message.error.message || "CDP error"));
      } else {
        pending.resolve(message.result || {});
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return cdpValue(result);
  }

  async close() {
    try {
      this.ws?.close();
    } catch {
      // noop
    }
  }
}

async function waitForDevtools(port, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const pages = await getJson(`http://127.0.0.1:${port}/json/list`, 1500);
      const page = Array.isArray(pages) ? pages.find((item) => item.type === "page") : null;
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still booting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  for (let i = 0; i < 100; i += 1) {
    const state = await client.evaluate("document.readyState");
    if (state === "complete") break;
    await sleep(200);
  }
  await sleep(800);
}

async function waitForCondition(client, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await sleep(250);
  }
  return null;
}

async function runBrowserFlow(browserPath) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profileDir = path.join(os.tmpdir(), `aray-browser-cart-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const args = [
    headed ? null : "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-sync",
    "--window-size=1365,900",
    process.platform === "linux" ? "--no-sandbox" : null,
    "about:blank",
  ].filter(Boolean);

  const chrome = spawn(browserPath, args, {
    cwd: root,
    stdio: "ignore",
    windowsHide: true,
  });

  let client;
  try {
    const wsUrl = await waitForDevtools(port);
    client = new CdpClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await navigate(client, `${baseUrl}/catalog`);
    await sleep(1800);
    const productHref = await client.evaluate(`(${() => {
      return Array.from(document.querySelectorAll('a[href^="/product/"]'))
        .map((link) => link.getAttribute("href"))
        .find(Boolean) || "/product/doska-stroganaya-suhaya-sosna";
    }})()`);
    const clickResult = await waitForCondition(
      client,
      `(${() => {
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const buttons = Array.from(document.querySelectorAll("[data-add-to-cart], button.store-card-cta:not([disabled])"))
          .filter((button) => !button.disabled && isVisible(button));
        if (!buttons.length) return null;
        const button = buttons[0];
        button.scrollIntoView({ block: "center", inline: "center" });
        button.click();
        return {
          clicked: true,
          count: buttons.length,
          text: button.textContent?.trim() || "",
          url: window.location.href,
        };
      }})()`,
      25000,
    );

    check(
      "Catalog add button is clickable",
      Boolean(clickResult?.clicked),
      clickResult ? `Clicked: ${clickResult.text || "button"} (${clickResult.count} candidates)` : "No visible add-to-cart button found.",
    );
    if (!clickResult?.clicked) return;

    await waitForCondition(client, `(${() => {
      const raw = window.localStorage.getItem("pilo-rus-cart");
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        const items = parsed?.state?.items ?? parsed?.items ?? [];
        return Array.isArray(items) && items.length > 0;
      } catch {
        return false;
      }
    }})()`, 5000);
    const readStorageState = () => `(${() => {
      const raw = window.localStorage.getItem("pilo-rus-cart");
      let items = [];
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        items = parsed?.state?.items ?? parsed?.items ?? [];
      } catch {
        items = [];
      }
      return {
        rawLength: raw?.length ?? 0,
        itemsCount: Array.isArray(items) ? items.length : 0,
        firstItem: Array.isArray(items) ? items[0] ?? null : null,
      };
    }})()`;
    let storageState = await client.evaluate(readStorageState());

    if (storageState.itemsCount === 0) {
      await client.evaluate(`(${() => {
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const button = Array.from(document.querySelectorAll("[data-add-to-cart], button.store-card-cta:not([disabled])"))
          .find((item) => !item.disabled && isVisible(item));
        button?.click();
        return Boolean(button);
      }})()`);
      await waitForCondition(client, `(${() => {
        const raw = window.localStorage.getItem("pilo-rus-cart");
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          const items = parsed?.state?.items ?? parsed?.items ?? [];
          return Array.isArray(items) && items.length > 0;
        } catch {
          return false;
        }
      }})()`, 7000);
      storageState = await client.evaluate(readStorageState());
    }

    check(
      "Browser localStorage keeps cart item",
      storageState.itemsCount > 0,
      `localStorage items: ${storageState.itemsCount}, bytes: ${storageState.rawLength}`,
    );

    await navigate(client, `${baseUrl}/cart`);
    await waitForCondition(client, "document.querySelector('[data-cart-item], [data-cart-empty-state]') !== null", 20000);
    await waitForCondition(client, "document.querySelectorAll('[data-cart-item]').length > 0", 2500);
    const cartPageState = await client.evaluate(`(${() => {
      const raw = window.localStorage.getItem("pilo-rus-cart");
      let storedItems = [];
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        storedItems = parsed?.state?.items ?? parsed?.items ?? [];
      } catch {
        storedItems = [];
      }
      const items = Array.from(document.querySelectorAll("[data-cart-item]"));
      const pageState = document.querySelector("[data-cart-page-state]");
      return {
        itemsCount: items.length,
        emptyVisible: Boolean(document.querySelector("[data-cart-empty-state]")),
        checkoutVisible: Boolean(document.querySelector("[data-cart-checkout-link]")),
        storedItemsCount: Array.isArray(storedItems) ? storedItems.length : 0,
        firstStoredItem: Array.isArray(storedItems) ? storedItems[0] ?? null : null,
        rawLength: raw?.length ?? 0,
        pageState: pageState
          ? {
              storeItems: pageState.getAttribute("data-store-items"),
              fallbackItems: pageState.getAttribute("data-fallback-items"),
              visibleItems: pageState.getAttribute("data-visible-items"),
              hydrated: pageState.getAttribute("data-hydrated"),
              effectReady: pageState.getAttribute("data-effect-ready"),
            }
          : null,
        title: document.title,
        url: window.location.href,
      };
    }})()`);

    check(
      "Cart page renders added item",
      cartPageState.itemsCount > 0 && !cartPageState.emptyVisible,
      `cart items: ${cartPageState.itemsCount}, empty state: ${cartPageState.emptyVisible}, page: ${JSON.stringify(cartPageState.pageState)}, stored items on /cart: ${cartPageState.storedItemsCount}, bytes: ${cartPageState.rawLength}, first: ${JSON.stringify(cartPageState.firstStoredItem)?.slice(0, 700)}`,
    );
    check(
      "Checkout link is visible with cart item",
      cartPageState.checkoutVisible,
      "Cart page should offer checkout when items exist.",
    );

    await navigate(client, `${baseUrl}${productHref}`);
    await waitForCondition(client, "document.querySelector('[data-product-seller-panel]') !== null", 20000);
    const productPageState = await client.evaluate(`(${() => ({
      sellerPanel: Boolean(document.querySelector("[data-product-seller-panel]")),
      shareButton: Boolean(document.querySelector("[data-product-share]")),
      channels: Array.from(document.querySelectorAll("[data-product-channel]"))
        .map((node) => node.getAttribute("data-product-channel"))
        .filter(Boolean),
      requestMessage: Boolean(document.querySelector("[data-product-request-message]")),
      requestContact: Boolean(document.querySelector("[data-product-request-contact]")),
      requestSubmit: Boolean(document.querySelector("[data-product-request-submit]")),
      text: document.body.innerText.slice(0, 4000),
    })})()`);
    check(
      "Product page has seller and sharing controls",
      productPageState.sellerPanel &&
        productPageState.shareButton &&
        productPageState.requestMessage &&
        productPageState.requestContact &&
        productPageState.requestSubmit,
      `seller: ${productPageState.sellerPanel}, share: ${productPageState.shareButton}, form: ${productPageState.requestMessage}/${productPageState.requestContact}/${productPageState.requestSubmit}`,
    );
    check(
      "Product page exposes omnichannel choices",
      ["aray", "telegram", "whatsapp", "email", "phone", "zangi"].every((channel) => productPageState.channels.includes(channel)),
      `channels: ${productPageState.channels.join(", ")}`,
    );
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
    for (let i = 0; i < 5; i += 1) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        break;
      } catch {
        await sleep(300);
      }
    }
  }
}

async function main() {
  const baseReady = await ensureBaseServer();
  check("Base site is reachable", baseReady, `${baseUrl}/api/health`);
  if (!baseReady) {
    if (optional) return writeReportAndExit();
    throw new Error(`Base site is not reachable: ${baseUrl}`);
  }

  const browserPath = findBrowserExecutable();
  check("Chrome or Edge browser is available", Boolean(browserPath), browserPath || "Set CHROME_PATH to enable browser checks.");
  if (!browserPath) {
    if (optional) return writeReportAndExit();
    throw new Error("No Chrome/Edge executable found for browser cart check.");
  }

  await runBrowserFlow(browserPath);
  writeReportAndExit();
}

function writeReportAndExit() {
  const failed = checks.filter((item) => !item.ok);
  fs.mkdirSync(reportDir, { recursive: true });
  const report = [
    "# Browser Cart Flow Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Optional: ${optional ? "yes" : "no"}`,
    "",
    ...checks.map((item) => `- ${item.ok ? "[OK]" : "[FAIL]"} ${item.name}: ${item.detail}`),
    "",
    failed.length ? `Result: FAILED (${failed.length})` : "Result: PASSED",
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, report, "utf8");

  if (failed.length && !optional) {
    console.error("[ARAY] Browser cart flow failed:");
    for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  if (failed.length) {
    console.warn(`[ARAY] Browser cart flow skipped/failed in optional mode (${failed.length} issue(s))`);
  } else {
    console.log(`[ARAY] Browser cart flow passed (${checks.length} gates)`);
  }
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  check("Browser cart flow runtime", false, error?.message || String(error));
  writeReportAndExit();
});
