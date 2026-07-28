import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { materializeGeneratedBundle } from "../src/artifact-writer.js";

describe("generated bundle materialization", () => {
  it("writes an isolated bundle and records a digest for every artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-worker-"));
    try {
      const result = await materializeGeneratedBundle(directory, {
        rootDirectory: "expense-published-1",
        graphHash: "sha256:abc",
        files: [
          { path: "web/app/page.tsx", content: "export default function Page() { return null; }\n" },
          { path: "docs/application.md", content: "# Expense\n" },
        ],
      });

      expect(result.directory).toBe(join(directory, "expense-published-1"));
      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts.every((artifact) => artifact.digest.startsWith("sha256:"))).toBe(true);
      await expect(readFile(join(result.directory, "docs/application.md"), "utf8")).resolves.toBe("# Expense\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects output traversal before writing files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-worker-"));
    try {
      await expect(
        materializeGeneratedBundle(directory, {
          rootDirectory: "safe",
          graphHash: "sha256:abc",
          files: [{ path: "../outside.txt", content: "no" }],
        }),
      ).rejects.toThrow("outside the isolated application directory");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
