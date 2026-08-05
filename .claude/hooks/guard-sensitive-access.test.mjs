import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const hookPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "guard-sensitive-access.mjs",
);

function invokeHook(input) {
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function bash(command) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
  };
}

test("blocks direct and subprocess access to environment files", () => {
  for (const command of [
    "Get-Content .env",
    "type packages\\api\\.env.local",
    "node -e \"require('fs').readFileSync('.env')\"",
    "python -c \"open('services/.env.production').read()\"",
  ]) {
    const result = invokeHook(bash(command));
    assert.equal(result.status, 2, command);
    assert.match(result.stderr, /sensitive/i);
  }
});

test("blocks credential stores and environment dumps", () => {
  for (const command of [
    "Get-Content secrets/api-key.txt",
    "cat config/credentials.json",
    "printenv",
    "Get-ChildItem Env:",
  ]) {
    const result = invokeHook(bash(command));
    assert.equal(result.status, 2, command);
  }
});

test("blocks built-in file tools from sensitive paths", () => {
  for (const toolName of ["Read", "Write", "Edit"]) {
    const result = invokeHook({
      hook_event_name: "PreToolUse",
      tool_name: toolName,
      tool_input: { file_path: "services/payments/.env.local" },
    });
    assert.equal(result.status, 2, toolName);
  }
});

test("allows ordinary repository commands", () => {
  for (const command of [
    "pnpm --filter @factory/compiler test",
    "git status --short",
    "node scripts/verify-third-party-notices.mjs",
    "Get-Content .env.example",
  ]) {
    const result = invokeHook(bash(command));
    assert.equal(result.status, 0, command);
    assert.equal(result.stderr, "");
  }
});

test("allows the tracked environment example through built-in reads", () => {
  const result = invokeHook({
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: { file_path: "packages/example/.env.example" },
  });

  assert.equal(result.status, 0);
});
