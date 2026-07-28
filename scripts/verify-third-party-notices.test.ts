import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const noticesPath = resolve(repositoryRoot, "docs/third-party-notices.md");

function readNoticeKeys(): readonly string[] {
  if (!existsSync(noticesPath)) return [];
  return Array.from(
    readFileSync(noticesPath, "utf8").matchAll(/^## Package: `([^`]+)`$/gm),
    ([, key]) => key,
  );
}

describe("third-party notices", () => {
  it("records every direct Application Graph ecosystem dependency", () => {
    expect(readNoticeKeys()).toEqual(
      expect.arrayContaining([
        "@puckeditor/core",
        "@xyflow/react",
        "xstate",
        "prisma",
        "casbin",
      ]),
    );
  });
});
