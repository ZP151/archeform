import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const directory = "docs/acceptance/evidence/definition-batch-one";
const project = "factory-t9-definition-batch-20260913";
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const paths = [
  "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
  "packages/adapters/src/requirements/product-definition-data.ts",
  "packages/adapters/src/requirements/definition-family-registry.ts",
  "packages/adapters/src/requirements/definition-selection-catalogue.ts",
  "packages/compiler/src/approval-mutation-contract.ts",
  "packages/compiler/src/approval-workspace-presentation.ts",
  "packages/compiler/src/index.ts",
  "packages/compiler/src/approval-decision-history.ts",
  "apps/compiler-worker/src/verifier/probes.ts",
  "apps/compiler-worker/src/verifier/role-journey.ts",
  "apps/workbench/lib/product-journey/use-consumer-generation.ts",
];
const hash = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const files = Object.fromEntries(paths.map((path) => [path, hash(path)]));
const images = ["control-plane", "compiler-worker", "workbench"].map(
  (service) => {
    // Only the worker executes compiler source. Preserve valid unchanged
    // Workbench/Control Plane images instead of rebuilding their unused copies.
    const servicePaths = paths.filter(
      (path) =>
        service === "compiler-worker" || !path.startsWith("packages/compiler/"),
    );
    const expected = Object.fromEntries(
      servicePaths.map((path) => [path, files[path]]),
    );
    const container = docker(
      "ps",
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--filter",
      `label=com.docker.compose.service=${service}`,
      "--quiet",
    );
    assert.match(container, /^[a-f0-9]+$/);
    const actual = JSON.parse(
      docker(
        "exec",
        container,
        "node",
        "-e",
        'const f=require("node:fs"),c=require("node:crypto"); console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[1]).map(p=>[p,c.createHash("sha256").update(f.readFileSync("/workspace/"+p)).digest("hex")]))));',
        JSON.stringify(servicePaths),
      ),
    );
    assert.deepEqual(
      actual,
      expected,
      `${service} must contain final runtime source`,
    );
    if (service === "workbench") {
      assert.equal(
        docker(
          "exec",
          container,
          "node",
          "-e",
          "console.log(Boolean(process.env.OPENAI_API_KEY))",
        ),
        "false",
      );
      const sourceData = paths[0];
      const builtHash = docker(
        "exec",
        container,
        "node",
        "-e",
        'const f=require("node:fs"),c=require("node:crypto"); console.log(c.createHash("sha256").update(f.readFileSync(process.argv[1])).digest("hex"));',
        "/workspace/packages/adapters/dist/requirements/definitions/product-definitions.v1.json",
      );
      assert.equal(
        builtHash,
        files[sourceData],
        "Runtime copied catalogue matches source",
      );
    }
    return {
      service,
      image: docker("inspect", "--format", "{{.Image}}", container),
      sourceFilesMatched: servicePaths.length,
      sourcePaths: servicePaths,
    };
  },
);
writeFileSync(
  `${directory}/runtime-identity.json`,
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      base: "327eb9086ff79f521e87e4db072120763b95b3e5",
      project,
      images,
      files,
      providerKeyPresent: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS: three running images match source; built catalogue matches; provider disabled.",
);
