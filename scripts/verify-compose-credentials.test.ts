import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  serviceSection,
  verifyComposeCredentialBoundary,
} from "./verify-compose-credentials.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const composeYaml = readFileSync(
  resolve(repositoryRoot, "infra/docker-compose.yml"),
  "utf8",
);
const compilerSource = readFileSync(
  resolve(repositoryRoot, "packages/compiler/src/index.ts"),
  "utf8",
);

describe("Compose model-credential boundary", () => {
  it("runs the shared boundary verification without violations", () => {
    expect(() =>
      verifyComposeCredentialBoundary({ composeYaml, compilerSource }),
    ).not.toThrow();
  });

  it("gives the Workbench server OPENAI_API_KEY and OPENAI_MODEL as interpolation", () => {
    const environment = serviceSection(composeYaml, "workbench", "environment");
    // The interpret route runs in the Workbench server; without the key it
    // fails closed with 503 and the journey cannot start.
    expect(environment.get("OPENAI_API_KEY")).toMatch(/^\$\{OPENAI_API_KEY:-/);
    expect(environment.get("OPENAI_MODEL")).toMatch(/^\$\{OPENAI_MODEL:-/);
  });

  it("never gives the Compiler Worker model credentials", () => {
    const environment = serviceSection(
      composeYaml,
      "compiler-worker",
      "environment",
    );
    expect(environment.has("OPENAI_API_KEY")).toBe(false);
    expect(environment.has("OPENAI_MODEL")).toBe(false);
  });

  it("never exposes model credentials to browser bundles", () => {
    expect(composeYaml).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*OPENAI[A-Z0-9_]*/);
  });

  it("never emits model credentials into generated applications", () => {
    // The bundle generator renders the generated Dockerfile and Compose
    // file; it must not reference model credentials at all, and the
    // generated web image excludes .env from its build context.
    expect(compilerSource).not.toMatch(/OPENAI_API_KEY|OPENAI_MODEL/);
    expect(compilerSource).toMatch(/\.env\\n/);
  });
});
