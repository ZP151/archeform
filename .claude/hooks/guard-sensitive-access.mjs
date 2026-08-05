import process from "node:process";

const input = await readInput();

if (isSensitiveAccess(input)) {
  console.error(
    "Blocked sensitive-data access. Run this goal in its credential-free worktree and pass required values only through a bounded process environment.",
  );
  process.exit(2);
}

process.exit(0);

async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.error("Blocked malformed Claude Code hook input.");
    process.exit(2);
  }
}

function isSensitiveAccess(event) {
  const toolName = String(event?.tool_name ?? "");
  const toolInput = event?.tool_input ?? {};

  if (toolName === "Bash") {
    return isSensitiveCommand(String(toolInput.command ?? ""));
  }

  if (["Read", "Write", "Edit"].includes(toolName)) {
    return pathCandidates(toolInput).some(isSensitivePath);
  }

  return false;
}

function pathCandidates(input) {
  return [input.file_path, input.path, input.notebook_path, input.destination]
    .filter((value) => typeof value === "string")
    .map(String);
}

function isSensitivePath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (isEnvironmentExample(normalized)) {
    return false;
  }

  return (
    /(^|\/)\.env(?:\.[^/]*)?$/i.test(normalized) ||
    /(^|\/)secrets(?:\/|$)/i.test(normalized) ||
    /(^|\/)config\/credentials\.json$/i.test(normalized)
  );
}

function isSensitiveCommand(command) {
  const normalized = command.replaceAll("\\", "/");
  const inspected = normalized.replace(
    /(^|[\s"'=:(])(?:[^\s"']+\/)*\.env\.example(?=$|[\s"';|&),])/gi,
    "$1TRACKED_ENVIRONMENT_EXAMPLE",
  );
  const pathReference =
    /(^|[\s"'=:(])(?:[^\s"']+\/)*\.env(?:\.[a-z0-9_-]+)?(?=$|[\s"';|&),])/i;
  const secretStore =
    /(^|[\s"'=:(])(?:[^\s"']+\/)*secrets(?:\/|(?=$|[\s"';|&),]))/i;
  const credentialStore =
    /(^|[\s"'=:(])(?:[^\s"']+\/)*config\/credentials\.json(?=$|[\s"';|&),])/i;
  const environmentDump =
    /(^|[;&|]\s*)(printenv|env|set)(\s|$)|\b(Get-ChildItem|Get-Item|dir|gci)\s+Env:/i;
  const namedCredential =
    /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY)\b/i;

  return (
    pathReference.test(inspected) ||
    secretStore.test(inspected) ||
    credentialStore.test(inspected) ||
    environmentDump.test(inspected) ||
    namedCredential.test(inspected)
  );
}

function isEnvironmentExample(value) {
  return /(^|\/)\.env\.example$/i.test(value);
}
