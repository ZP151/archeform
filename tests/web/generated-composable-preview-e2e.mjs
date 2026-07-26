import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(
    process.env.FACTORY_PLAYWRIGHT_PATH
      || "C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  );
}
const { chromium } = playwright;

const ROOT = process.cwd();
const PYTHON = process.env.FACTORY_PYTHON_PATH || "python";
const COMMAND_TIMEOUT_MS = 8 * 60 * 1000;
const WEB_READY_TIMEOUT_MS = 90 * 1000;
const APPLICATION_LIMIT = Number.parseInt(process.env.FACTORY_E2E_APPLICATION_LIMIT || "2", 10);

function run(command, args, { cwd = ROOT, env = process.env, timeout = COMMAND_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} ${args.join(" ")} timed out after ${timeout}ms\n${stdout}\n${stderr}`));
    }, timeout);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      const result = { code, stdout, stderr };
      if (code === 0) resolve(result);
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function unusedLoopbackPort() {
  const { createServer } = await import("node:http");
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForWeb(url) {
  const deadline = Date.now() + WEB_READY_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`generated web preview did not become ready at ${url}: ${lastError}`);
}

function composeArgs(project, output, ...args) {
  return ["compose", "--project-name", project, "--file", join(output, "docker-compose.yml"), ...args];
}

async function createFixtureOutputs(root) {
  const script = String.raw`
import json
import sys
from pathlib import Path

from apps.api.control_plane import ControlPlane
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider

root = Path(sys.argv[1])
plane = ControlPlane(
    root / "state.json",
    root / "runs",
    provider=FixtureRequirementToDefinitionProvider(),
    composable_enabled=True,
    component_package_root=Path.cwd() / "packages" / "components",
)
results = []
for name, brief in (
    ("leave-approval", "Employees submit leave requests and managers approve them."),
    ("expense-approval", "Employees submit expense claims and managers approve them."),
):
    created = plane.create_project(name, brief)
    version = plane.approve_version(created["version"]["id"], "browser-e2e")
    plan = plane.create_plan_for_version(version["id"])
    plane.approve_plan(plan["id"], "browser-e2e")
    run = plane.create_run(plan["id"])
    results.append({
        "name": name,
        "output": str(root / "runs" / run["id"] / "output"),
        "locks": plan["composition"]["component_locks"],
        "record_label": version["definition"]["primary_record"]["label"],
        "fields": version["definition"]["primary_record"]["fields"],
        "roles": {role["kind"]: role["id"] for role in version["definition"]["roles"]},
        "sessionCookieName": plan["composition"]["validated_inputs"]["backend.session-auth"]["cookie_name"],
        "submitLabel": plan["composition"]["validated_inputs"]["ui.approval-form"]["submit_label"],
    })
print(json.dumps(results, sort_keys=True))
`;
  // Source changes are concurrent during the component-suite hand-off.  Bypass
  // stale local bytecode so this test proves the files in the current worktree.
  const result = await run(PYTHON, ["-B", "-c", script, root]);
  const jsonLine = result.stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(jsonLine);
}

async function signInAs(page, actor, sessionCookieName) {
  await page.locator("select").selectOption(actor);
  const signInResponse = page.waitForResponse((response) => (
    response.url().endsWith("/session/sign-in") && response.request().method() === "POST"
  ));
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await signInResponse;
  const responseBody = await response.text();
  assert.equal(response.status(), 200, `local browser sign-in for ${actor} returned ${response.status()}: ${responseBody}`);
  await page.getByRole("button", { name: "Switch role" }).waitFor();
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === sessionCookieName);
  assert.ok(session, `browser did not retain a session cookie for ${actor}`);
  return session.value;
}

async function switchAndSignIn(page, actor, sessionCookieName) {
  await page.getByRole("button", { name: "Switch role" }).click();
  return signInAs(page, actor, sessionCookieName);
}

function valueFor(field) {
  if (field.type === "date") return "2026-08-01";
  if (field.type === "number") return "42";
  if (field.type === "enum") return field.options[0];
  return `Browser proof for ${field.label}`;
}

async function completeBrowserApproval({ browser, application, webUrl }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(webUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: `${application.record_label} approval` }).waitFor();

    const submitterCookie = await signInAs(page, application.roles.submitter, application.sessionCookieName);
    await page.getByRole("heading", { name: application.record_label, exact: true }).waitFor();
    for (const field of application.fields) {
      const control = page.locator(`#submit [name="${field.id}"]`);
      if (field.type === "enum") await control.selectOption(valueFor(field));
      else await control.fill(valueFor(field));
    }
    await page.getByRole("button", { name: application.submitLabel, exact: true }).click();
    await page.getByText("pending", { exact: true }).waitFor();

    const approverCookie = await switchAndSignIn(page, application.roles.approver, application.sessionCookieName);
    assert.notEqual(approverCookie, submitterCookie, "role switch did not replace the browser session cookie");
    await page.getByRole("heading", { name: "Approval queue" }).waitFor();
    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByText("approved", { exact: true }).waitFor();

    const auditorCookie = await switchAndSignIn(page, application.roles.auditor, application.sessionCookieName);
    assert.notEqual(auditorCookie, approverCookie, "auditor sign-in did not replace the browser session cookie");
    await page.getByRole("heading", { name: "Audit history" }).waitFor();
    await page.getByText(`${application.name === "leave-approval" ? "leave_request" : "expense_claim"}.submitted`, { exact: true }).waitFor();
    await page.getByText(`${application.name === "leave-approval" ? "leave_request" : "expense_claim"}.approved`, { exact: true }).waitFor();
  } finally {
    await context.close();
  }
}

async function verifyCleanup(project, output, environment) {
  const services = await run("docker", composeArgs(project, output, "ps", "--all", "--services"), { env: environment });
  assert.equal(services.stdout.trim(), "", `Compose services remain after cleanup for ${project}`);
  const volumes = await run("docker", ["volume", "ls", "--filter", `label=com.docker.compose.project=${project}`, "--format", "{{.Name}}"], { env: environment });
  assert.equal(volumes.stdout.trim(), "", `Compose volumes remain after cleanup for ${project}`);
}

async function runApplication(browser, application, index) {
  const apiPort = await unusedLoopbackPort();
  const output = application.output;
  const project = `factory_browser_e2e_${process.pid}_${index}`;
  const environment = {
    ...process.env,
    FACTORY_API_HOST_PORT: String(apiPort),
    DOCKER_HOST: "",
    DOCKER_CONTEXT: "",
  };
  let started = false;
  try {
    await run("docker", composeArgs(project, output, "up", "--build", "--detach"), { env: environment });
    started = true;
    const webPort = (await run("docker", composeArgs(project, output, "port", "web", "3000"), { env: environment })).stdout.trim().match(/:(\d+)$/)?.[1];
    assert.ok(webPort, "Compose did not report a loopback web port");
    const webUrl = `http://127.0.0.1:${webPort}`;
    await waitForWeb(webUrl);
    await completeBrowserApproval({ browser, application, webUrl });
    return { name: application.name, webUrl, apiPort };
  } finally {
    if (started) {
      await run("docker", composeArgs(project, output, "down", "--volumes", "--remove-orphans"), { env: environment });
    }
    await verifyCleanup(project, output, environment);
  }
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), "factory-composable-browser-e2e-"));
  let browser;
  try {
    const applications = await createFixtureOutputs(root);
    assert.equal(applications.length, 2, "fixture materialization must create leave and expense applications");
    assert.ok(APPLICATION_LIMIT >= 1 && APPLICATION_LIMIT <= applications.length, "application limit must select one or both proof applications");
    assert.deepEqual(applications[0].locks, applications[1].locks, "proof applications must use identical component locks");
    assert.notEqual(applications[0].record_label, applications[1].record_label, "proof applications must expose distinct labels");
    assert.notDeepEqual(applications[0].fields, applications[1].fields, "proof applications must expose distinct validated fields");

    browser = await chromium.launch({ headless: true });
    const evidence = [];
    for (const [index, application] of applications.slice(0, APPLICATION_LIMIT).entries()) {
      evidence.push(await runApplication(browser, application, index));
    }
    console.log(JSON.stringify({ status: "passed", applications: evidence }, null, 2));
  } finally {
    await browser?.close();
    await rm(root, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}

// Playwright keeps a pipe handle open briefly on Windows after a clean close.
// Delay the explicit exit long enough for the JSON evidence above to reach the
// invoking terminal; all application and Compose cleanup has already finished.
setTimeout(() => process.exit(process.exitCode || 0), 250);
