import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { GeneratedArtifactReader } from "../src/artifact-content.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function digest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

describe("GeneratedArtifactReader", () => {
  it("returns a registered generated source snapshot only when its digest still matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-artifact-"));
    temporaryDirectories.push(root);
    const content = "export const application = 'expense';\n";
    await mkdir(join(root, "expense-published-1", "api", "src"), {
      recursive: true,
    });
    await writeFile(
      join(root, "expense-published-1", "api", "src", "main.ts"),
      content,
      "utf8",
    );

    const reader = new GeneratedArtifactReader(root);

    await expect(
      reader.read({
        rootDirectory: "expense-published-1",
        path: "api/src/main.ts",
        digest: digest(content),
      }),
    ).resolves.toEqual({
      path: "api/src/main.ts",
      digest: digest(content),
      content,
    });
  });

  it("fails closed for escaping paths and changed generated files", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-artifact-"));
    temporaryDirectories.push(root);
    const reader = new GeneratedArtifactReader(root);

    await expect(
      reader.read({
        rootDirectory: "expense-published-1",
        path: "../.env",
        digest: digest("irrelevant"),
      }),
    ).rejects.toThrow("safe relative path");

    await mkdir(join(root, "expense-published-1"), { recursive: true });
    await writeFile(
      join(root, "expense-published-1", "README.md"),
      "changed",
      "utf8",
    );
    await expect(
      reader.read({
        rootDirectory: "expense-published-1",
        path: "README.md",
        digest: digest("original"),
      }),
    ).rejects.toThrow("digest does not match");
  });
});
