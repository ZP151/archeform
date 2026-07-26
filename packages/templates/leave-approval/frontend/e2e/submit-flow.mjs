import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WEB_URL = process.env.LEAVE_WEB_BASE_URL ?? "http://localhost:3000";
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find(existsSync);
if (!chromePath) {
  throw new Error("Chrome or Edge is required; set CHROME_PATH to its executable");
}

const profile = await mkdtemp(join(tmpdir(), "factory-pilot-browser-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-default-browser-check",
  "--no-first-run",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDevTools() {
  const activePortFile = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (existsSync(activePortFile)) {
      const [port] = readFileSync(activePortFile, "utf8").trim().split(/\r?\n/);
      return Number(port);
    }
    if (chrome.exitCode !== null) {
      throw new Error(`browser exited before DevTools started (${chrome.exitCode})`);
    }
    await delay(50);
  }
  throw new Error("browser DevTools endpoint did not start");
}

let socket;
let nextCommandId = 0;
const pendingCommands = new Map();

async function connect(webSocketDebuggerUrl) {
  socket = new WebSocket(webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) {
      return;
    }
    const pending = pendingCommands.get(message.id);
    if (!pending) {
      return;
    }
    pendingCommands.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools WebSocket connection failed")), { once: true });
  });
}

function command(method, params = {}) {
  const id = ++nextCommandId;
  return new Promise((resolve, reject) => {
    pendingCommands.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitForState(expression, description, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  let latest;
  while (Date.now() < deadline) {
    latest = await evaluate(expression);
    if (latest?.passed) {
      return latest;
    }
    if (latest?.alert) {
      throw new Error(`${description}: ${JSON.stringify(latest)}`);
    }
    await delay(100);
  }
  throw new Error(`${description}: ${JSON.stringify(latest)}`);
}

try {
  const port = await waitForDevTools();
  const target = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(WEB_URL)}`,
    { method: "PUT" },
  ).then((response) => response.json());
  await connect(target.webSocketDebuggerUrl);
  await command("Page.enable");
  await command("Runtime.enable");

  await waitForState(
    `(() => {
      const form = document.querySelector("form.request-form");
      const button = form?.querySelector('button[type="submit"]');
      const hydrated = Boolean(form)
        && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
      return { passed: Boolean(form && button && !button.disabled && hydrated) };
    })()`,
    "employee form did not become ready",
  );

  const reason = `Browser regression ${Date.now()}`;
  await evaluate(
    `(() => {
      const form = document.querySelector("form.request-form");
      form.elements.start_date.value = "2026-08-03";
      form.elements.end_date.value = "2026-08-05";
      form.elements.reason.value = ${JSON.stringify(reason)};
      form.requestSubmit();
      return true;
    })()`,
  );

  const outcome = await waitForState(
    `(() => {
      const form = document.querySelector("form.request-form");
      const values = form ? {
        startDate: form.elements.start_date.value,
        endDate: form.elements.end_date.value,
        reason: form.elements.reason.value,
      } : null;
      const alert = document.querySelector('[role="alert"]')?.textContent?.trim() ?? "";
      const refreshed = [...document.querySelectorAll(".request-card p")]
        .some((element) => element.textContent === ${JSON.stringify(reason)});
      const cleared = Boolean(values)
        && values.startDate === ""
        && values.endDate === ""
        && values.reason === "";
      return { passed: cleared && refreshed && alert === "", cleared, refreshed, alert, values };
    })()`,
    "successful submission did not clear inputs and refresh the request list without an alert",
  );
  console.log(JSON.stringify({ status: "passed", ...outcome }));
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try {
      await command("Browser.close");
    } catch {
      socket.close();
    }
  }
  if (chrome.exitCode === null) {
    await Promise.race([once(chrome, "exit"), delay(2_000)]);
  }
  if (chrome.exitCode === null) {
    chrome.kill();
    await Promise.race([once(chrome, "exit"), delay(2_000)]);
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
