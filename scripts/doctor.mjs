import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const expectedNodeSelector = "22.11.0\n";
const expectedNodeRange = ">=22.11.0 <23";
const expectedPackageManager = "pnpm@9.0.0";
const expectedPnpmRange = ">=9";
const defaultCommandTimeoutMilliseconds = 10_000;
const requiredEnvironmentNames = Object.freeze([
  "FACTORY_REDIS_PASSWORD",
  "FACTORY_INTERNAL_WORKER_TOKEN",
]);
const usage = "Usage: node scripts/doctor.mjs <toolchain|local>\n";

async function defaultPathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function executeCommand(
  command,
  args,
  { timeoutMilliseconds = defaultCommandTimeoutMilliseconds } = {},
) {
  const executable =
    process.platform === "win32" && command === "pnpm"
      ? (process.env.ComSpec ?? "cmd.exe")
      : command;
  const executableArgs =
    process.platform === "win32" && command === "pnpm"
      ? ["/d", "/s", "/c", "pnpm --version"]
      : args;
  try {
    const { stdout } = await execFileAsync(executable, executableArgs, {
      encoding: "utf8",
      killSignal: "SIGTERM",
      timeout: timeoutMilliseconds,
      windowsHide: true,
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      exitCode:
        typeof error === "object" &&
        error !== null &&
        Number.isInteger(error.code)
          ? error.code
          : 1,
      stdout: "",
      stderr: "",
    };
  }
}

function check(name, ok, detail, remediation) {
  return remediation === undefined
    ? { name, ok, detail }
    : { name, ok, detail, remediation };
}

function numericVersion(value) {
  const trimmed = value.trim();
  return /^v?\d+\.\d+\.\d+$/u.test(trimmed) ? trimmed.replace(/^v/u, "") : null;
}

function supportedNode(value) {
  const version = numericVersion(value);
  if (version === null) return false;
  const [major, minor] = version.split(".").map(Number);
  return major === 22 && minor >= 11;
}

function normalizedPath(path) {
  const normalized = resolve(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function dockerClientVersion(output) {
  const match =
    /^Docker version (v?\d+\.\d+\.\d+)(?:[-+][0-9A-Za-z.-]+)?, build [^\r\n]+$/u.exec(
      output.trim(),
    );
  return match?.[1] ?? null;
}

function dockerServerVersion(output) {
  const match =
    /^v?(\d+\.\d+\.\d+)(?:[-+][0-9A-Za-z][0-9A-Za-z.+~-]{0,79})?$/u.exec(
      output.trim(),
    );
  return match?.[1] ?? null;
}

function dockerComposeVersion(output) {
  const match =
    /^(?:Docker Compose version )?(v?\d+\.\d+\.\d+)(?:[-+][0-9A-Za-z.-]+)?$/u.exec(
      output.trim(),
    );
  return match?.[1] ?? null;
}

function gitVersion(output) {
  const match =
    /^git version (\d+\.\d+\.\d+)(?:\.[0-9A-Za-z][0-9A-Za-z.-]{0,79})?(?: \([0-9A-Za-z][0-9A-Za-z ._+-]{0,79}\))?$/u.exec(
      output.trim(),
    );
  return match?.[1] ?? null;
}

export function parseEnvironmentNames(text) {
  const names = new Set();
  for (const line of text.split(/\r?\n/u)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
}

export async function evaluateDoctor(options) {
  const {
    scope,
    cwd = process.cwd(),
    nodeVersion = process.versions.node,
    readText = (path) => readFile(path, "utf8"),
    pathExists = defaultPathExists,
    runCommand = executeCommand,
  } = options;
  if (scope !== "toolchain" && scope !== "local") {
    throw new TypeError("Doctor scope must be toolchain or local.");
  }

  const checks = [];
  const manifestPath = resolve(cwd, "package.json");
  const selectorPath = resolve(cwd, ".node-version");
  let manifest;
  try {
    manifest = JSON.parse(await readText(manifestPath));
  } catch {
    manifest = null;
  }
  const manifestOk =
    manifest !== null &&
    manifest.name === "factory-pilot" &&
    manifest.packageManager === expectedPackageManager &&
    manifest.engines?.node === expectedNodeRange &&
    manifest.engines?.pnpm === expectedPnpmRange;
  checks.push(
    check(
      "manifest",
      manifestOk,
      manifestOk ? "accepted toolchain contract" : "toolchain contract drift",
      manifestOk
        ? undefined
        : "Restore the accepted package manager and engine values.",
    ),
  );

  let selector = "";
  try {
    selector = await readText(selectorPath);
  } catch {
    selector = "";
  }
  const selectorOk = selector === expectedNodeSelector;
  checks.push(
    check(
      "node-selector",
      selectorOk,
      selectorOk ? "22.11.0" : "missing or different",
      selectorOk
        ? undefined
        : "Set .node-version to exactly 22.11.0 with one trailing newline.",
    ),
  );

  const nodeOk = supportedNode(nodeVersion);
  const parsedNode = numericVersion(nodeVersion);
  checks.push(
    check(
      "node",
      nodeOk,
      parsedNode === null ? "invalid version" : `v${parsedNode}`,
      nodeOk ? undefined : "Use Node >=22.11.0 <23.",
    ),
  );

  const pnpm = await runCommand("pnpm", ["--version"]);
  const pnpmVersion = numericVersion(pnpm.stdout);
  const pnpmOk = pnpm.exitCode === 0 && pnpmVersion === "9.0.0";
  checks.push(
    check(
      "pnpm",
      pnpmOk,
      pnpmVersion ?? "unavailable",
      pnpmOk ? undefined : "Run corepack prepare pnpm@9.0.0 --activate.",
    ),
  );

  const git = await runCommand("git", ["--version"]);
  const gitVersionValue = gitVersion(git.stdout);
  const gitOk = git.exitCode === 0 && gitVersionValue !== null;
  checks.push(
    check(
      "git",
      gitOk,
      gitVersionValue ?? "unavailable",
      gitOk ? undefined : "Install Git and run the doctor from a checkout.",
    ),
  );
  const gitRoot = gitOk
    ? await runCommand("git", ["rev-parse", "--show-toplevel"])
    : { exitCode: 1, stdout: "", stderr: "" };
  const rootOk =
    gitRoot.exitCode === 0 &&
    gitRoot.stdout.trim().length > 0 &&
    normalizedPath(gitRoot.stdout.trim()) === normalizedPath(cwd);
  checks.push(
    check(
      "repository-root",
      rootOk,
      rootOk ? "current repository root" : "different working directory",
      rootOk ? undefined : "Run the doctor from the Archeform repository root.",
    ),
  );

  if (scope === "local") {
    const dockerClient = await runCommand("docker", ["--version"]);
    const dockerClientVersionValue = dockerClientVersion(dockerClient.stdout);
    const dockerClientOk =
      dockerClient.exitCode === 0 && dockerClientVersionValue !== null;
    checks.push(
      check(
        "docker-client",
        dockerClientOk,
        dockerClientVersionValue ?? "unavailable",
        dockerClientOk ? undefined : "Install the Docker client.",
      ),
    );

    const dockerServer = await runCommand("docker", [
      "info",
      "--format",
      "{{.ServerVersion}}",
    ]);
    const dockerServerVersionValue = dockerServerVersion(dockerServer.stdout);
    const dockerServerOk =
      dockerServer.exitCode === 0 && dockerServerVersionValue !== null;
    checks.push(
      check(
        "docker-server",
        dockerServerOk,
        dockerServerVersionValue ?? "unavailable",
        dockerServerOk ? undefined : "Start the Docker server.",
      ),
    );

    const compose = await runCommand("docker", [
      "compose",
      "version",
      "--short",
    ]);
    const composeVersionValue = dockerComposeVersion(compose.stdout);
    const composeOk = compose.exitCode === 0 && composeVersionValue !== null;
    checks.push(
      check(
        "docker-compose",
        composeOk,
        composeVersionValue ?? "unavailable",
        composeOk ? undefined : "Install the Docker Compose plugin.",
      ),
    );

    const environmentPath = resolve(cwd, ".env");
    const environmentExists = await pathExists(environmentPath);
    checks.push(
      check(
        "environment-file",
        environmentExists,
        environmentExists ? "present" : "missing",
        environmentExists
          ? undefined
          : "Copy .env.example to .env before local operation.",
      ),
    );

    let environmentNames = new Set();
    if (environmentExists) {
      try {
        environmentNames = parseEnvironmentNames(
          await readText(environmentPath),
        );
      } catch {
        environmentNames = new Set();
      }
    }
    const missingNames = requiredEnvironmentNames.filter(
      (name) => !environmentNames.has(name),
    );
    const environmentNamesOk = environmentExists && missingNames.length === 0;
    checks.push(
      check(
        "environment-names",
        environmentNamesOk,
        environmentNamesOk
          ? "required names present"
          : `Missing: ${missingNames.join(", ") || "required names"}`,
        environmentNamesOk
          ? undefined
          : "Add the missing names to .env; values are never displayed.",
      ),
    );
  }

  return {
    scope,
    ok: checks.every((candidate) => candidate.ok),
    checks: Object.freeze(checks),
  };
}

export function formatDoctorResult(result) {
  const lines = result.checks.map((candidate) => {
    const status = candidate.ok ? "PASS" : "FAIL";
    const remediation = candidate.remediation
      ? ` — ${candidate.remediation}`
      : "";
    return `${status} ${candidate.name}: ${candidate.detail}${remediation}`;
  });
  lines.push(`Doctor ${result.scope}: ${result.ok ? "PASS" : "FAIL"}`);
  return `${lines.join("\n")}\n`;
}

export async function runDoctorCli(args, dependencies = {}) {
  const writeOutput =
    dependencies.writeOutput ?? ((value) => process.stdout.write(value));
  if (args.length !== 1 || (args[0] !== "toolchain" && args[0] !== "local")) {
    writeOutput(usage);
    return 1;
  }
  const { writeOutput: _writeOutput, ...doctorDependencies } = dependencies;
  const result = await evaluateDoctor({
    scope: args[0],
    ...doctorDependencies,
  });
  writeOutput(formatDoctorResult(result));
  return result.ok ? 0 : 1;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runDoctorCli(process.argv.slice(2));
}
