// Standalone acceptance check for the model-credential boundary of the
// Compose stack. Invoked directly (`node scripts/verify-compose-credentials.mjs`)
// or through the vitest companion `verify-compose-credentials.test.ts`; both
// run the exact same assertions.
//
// Contract under test:
//   1. The Workbench server (the boundary that runs the requirement
//      interpretation route) receives OPENAI_API_KEY and OPENAI_MODEL —
//      always as `${...}` interpolation, never as a committed literal.
//   2. The Compiler Worker and generated applications never receive model
//      credentials; no service exposes them through a NEXT_PUBLIC_* name
//      (browser bundles), build args, or a literal secret value.
//   3. Only the server boundaries that may hold model credentials are
//      allowed to reference them.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

/** The only server boundaries that may hold model credentials. */
const ALLOWED_CREDENTIAL_SERVICES = new Set(["workbench", "control-plane"]);

/**
 * Extract `key -> raw value` entries of one `section` ("environment" or
 * "args") of one service from the Compose YAML. The parser is deliberately
 * line-based and strict about the file's indentation contract (services at
 * 2 spaces, service props at 4, section entries at 6/8); the file is small
 * and deterministic, and the assertions below fail loudly if the structure
 * drifts.
 */
export function serviceSection(composeYaml, serviceName, section) {
  const lines = composeYaml.split(/\r?\n/);
  const entries = new Map();
  let inService = false;
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(trimmed)) {
      inService = trimmed.trimStart().startsWith(`${serviceName}:`);
      inSection = false;
      continue;
    }
    if (!inService) continue;
    if (/^    [A-Za-z0-9_-]+:\s*$/.test(trimmed)) {
      inSection = trimmed.trimStart().startsWith(`${section}:`);
      continue;
    }
    if (!inSection) continue;
    const entry = trimmed.match(/^      ([A-Z0-9_]+):\s*(.*)$/);
    if (entry) entries.set(entry[1], entry[2]);
  }
  return entries;
}

/**
 * Throws with every violation listed; returns nothing on a clean boundary.
 * `compilerSource` is the source of the bundle generator
 * (packages/compiler/src/index.ts), which renders the generated
 * applications' Dockerfile and Compose file.
 */
export function verifyComposeCredentialBoundary({
  composeYaml,
  compilerSource,
}) {
  const errors = [];

  const workbenchEnv = serviceSection(composeYaml, "workbench", "environment");
  const workbenchArgs = serviceSection(composeYaml, "workbench", "args");
  const workerEnv = serviceSection(
    composeYaml,
    "compiler-worker",
    "environment",
  );

  // 1. The Workbench server receives both model credentials, interpolated.
  for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL"]) {
    const value = workbenchEnv.get(key);
    if (value === undefined) {
      errors.push(
        `workbench service is missing ${key} in its environment — the ` +
          "requirement interpretation route runs there and fails closed " +
          "without it (503).",
      );
    } else if (!new RegExp(`^\\$\\{${key}[:-]`).test(value)) {
      errors.push(
        `workbench service ${key} must be \${${key}:-...} interpolation ` +
          "(read from the local environment at compose time), never a " +
          "committed literal.",
      );
    }
  }

  // 2. The Compiler Worker never receives model credentials.
  for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL"]) {
    if (workerEnv.has(key)) {
      errors.push(
        `compiler-worker service must never receive ${key} — verification ` +
          "runs against generated previews and needs no model credentials.",
      );
    }
  }

  // 3. No NEXT_PUBLIC_* exposure of credential names (browser bundles), and
  //    no literal secret values in the Compose file.
  if (/NEXT_PUBLIC_[A-Z0-9_]*OPENAI[A-Z0-9_]*/.test(composeYaml)) {
    errors.push(
      "a NEXT_PUBLIC_* variable references model credentials — Next.js " +
        "inlines those into browser bundles; model credentials must stay " +
        "server-side only.",
    );
  }
  if (/sk-[A-Za-z0-9_-]{16,}/.test(composeYaml)) {
    errors.push(
      "the Compose file contains a literal credential-like value; model " +
        "credentials must arrive via ${...} interpolation from the local " +
        "environment only.",
    );
  }

  // 4. Model credentials are confined to the allowed server boundaries.
  const serviceNames = new Set(
    [...composeYaml.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].map(
      (match) => match[1],
    ),
  );
  for (const serviceName of serviceNames) {
    if (ALLOWED_CREDENTIAL_SERVICES.has(serviceName)) continue;
    const env = serviceSection(composeYaml, serviceName, "environment");
    const args = serviceSection(composeYaml, serviceName, "args");
    for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL"]) {
      if (env.has(key) || args.has(key)) {
        errors.push(
          `${serviceName} must never receive ${key} — only ` +
            `[${[...ALLOWED_CREDENTIAL_SERVICES].join(", ")}] may hold ` +
            "model credentials.",
        );
      }
    }
  }
  if (
    workbenchArgs.has("OPENAI_API_KEY") ||
    workbenchArgs.has("OPENAI_MODEL")
  ) {
    errors.push(
      "workbench build args must not carry model credentials (they can " +
        "leak into image metadata).",
    );
  }

  // 5. Generated applications never receive model credentials: the bundle
  //    generator that renders the generated Dockerfile and Compose file
  //    must not reference them at all, and the generated web image excludes
  //    any .env from the build context.
  if (/OPENAI_API_KEY|OPENAI_MODEL/.test(compilerSource)) {
    errors.push(
      "the bundle generator (packages/compiler) must not reference model " +
        "credentials — generated applications never receive them.",
    );
  }
  if (!/\.env\\n/.test(compilerSource)) {
    errors.push(
      "the generated web .dockerignore must exclude .env from the build " +
        "context.",
    );
  }

  if (errors.length > 0) {
    throw new Error(
      "Compose credential boundary violations:\n" +
        errors.map((error) => `  - ${error}`).join("\n"),
    );
  }
}

// Run directly: `node scripts/verify-compose-credentials.mjs`.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [composeYaml, compilerSource] = await Promise.all([
    readFile(resolve(repositoryRoot, "infra/docker-compose.yml"), "utf8"),
    readFile(resolve(repositoryRoot, "packages/compiler/src/index.ts"), "utf8"),
  ]);
  verifyComposeCredentialBoundary({ composeYaml, compilerSource });
  console.log(
    "Compose credential boundary verified: workbench receives OPENAI_API_KEY " +
      "and OPENAI_MODEL; worker and generated applications never do.",
  );
}
