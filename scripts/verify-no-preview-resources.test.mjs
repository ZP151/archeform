import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runNoPreviewResourceGuard } from "./verify-no-preview-resources.mjs";

const projectLabelFilter = "label=com.docker.compose.project";
const projectLabelFormat = '{{.Label "com.docker.compose.project"}}';
const expectedQueries = [
  ["ps", "-a", "--filter", projectLabelFilter, "--format", projectLabelFormat],
  [
    "network",
    "ls",
    "--filter",
    projectLabelFilter,
    "--format",
    projectLabelFormat,
  ],
  [
    "volume",
    "ls",
    "--filter",
    projectLabelFilter,
    "--format",
    projectLabelFormat,
  ],
];

function resourceKind(args) {
  if (args[0] === "ps") return "container";
  return args[0];
}

describe("no-preview-resource guard", () => {
  it("passes after querying only Compose project labels for every resource kind", async () => {
    const queries = [];
    const errors = [];

    const status = await runNoPreviewResourceGuard({
      runDocker: async (args) => {
        queries.push(args);
        return "";
      },
      writeError: (message) => errors.push(message),
    });

    assert.equal(status, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(queries, expectedQueries);
  });

  for (const kind of ["container", "network", "volume"]) {
    it(`fails generically when a matching preview ${kind} remains`, async () => {
      const errors = [];

      const status = await runNoPreviewResourceGuard({
        runDocker: async (args) =>
          resourceKind(args) === kind
            ? "factory-preview-preview-verification-1\n"
            : "",
        writeError: (message) => errors.push(message),
      });

      assert.equal(status, 1);
      assert.deepEqual(errors, [
        "ERROR: worker preview Docker resources remain.",
      ]);
    });
  }

  it("ignores the outer Compose project and unrelated labels", async () => {
    const errors = [];
    const unrelatedLabels = [
      "factory-t9-20260810-1234",
      "factory-preview-preview-",
      "factory-preview-preview-UPPER",
      "factory-preview-other-1",
      "unrelated",
    ].join("\n");

    const status = await runNoPreviewResourceGuard({
      runDocker: async () => unrelatedLabels,
      writeError: (message) => errors.push(message),
    });

    assert.equal(status, 0);
    assert.deepEqual(errors, []);
  });

  it("fails closed with a generic error when a Docker query fails", async () => {
    const errors = [];

    const status = await runNoPreviewResourceGuard({
      runDocker: async (args) => {
        if (resourceKind(args) === "network") {
          throw new Error("unbounded Docker failure must not surface");
        }
        return "";
      },
      writeError: (message) => errors.push(message),
    });

    assert.equal(status, 1);
    assert.deepEqual(errors, [
      "ERROR: unable to verify worker preview Docker resources.",
    ]);
  });
});
