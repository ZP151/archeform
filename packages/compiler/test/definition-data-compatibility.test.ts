import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { currentDefinitionDataCompatibility } from "./fixtures/definition-data-compatibility.js";
import type { GeneratedFile } from "../src/core/generated-files.js";
import {
  definitionDatabaseIdentifierComparison,
  IDENTIFIER_DATABASE_PATHS,
} from "./fixtures/legacy-database-identifiers.js";

describe("Product definition data compatibility", () => {
  it("preserves all five delivered definitions and complete Published bundles from bbb1e23c", () => {
    const baselineBytes = readFileSync(
      new URL("./fixtures/five-definition-baseline.json", import.meta.url),
      "utf8",
    );
    expect(createHash("sha256").update(baselineBytes).digest("hex")).toBe(
      "421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5",
    );
    const expected = JSON.parse(baselineBytes);
    expect(expected.base).toBe("bbb1e23c68f05e3ae213ceaf167737eb0fe86779");
    expect(expected.entries).toHaveLength(5);
    let changedFiles = 0;
    let semanticMaps = 0;
    const actual = currentDefinitionDataCompatibility(
      expected.entries.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
      (key, current, historical) => {
        const databasePaths = new Set<string>(IDENTIFIER_DATABASE_PATHS);
        const changedPaths = current
          .filter((file, index) => file.content !== historical[index]!.content)
          .map((file) => file.path);
        expect(changedPaths).toEqual(IDENTIFIER_DATABASE_PATHS);
        expect(current.filter((file) => !databasePaths.has(file.path))).toEqual(
          historical.filter((file) => !databasePaths.has(file.path)),
        );
        const schema = current.find(
          (file) => file.path === IDENTIFIER_DATABASE_PATHS[0],
        )!.content;
        const maps = [...schema.matchAll(/\bmap:\s*"/g)];
        expect(maps).toHaveLength(key === "purchase-request-approval" ? 2 : 1);
        changedFiles += changedPaths.length;
        semanticMaps += maps.length;
      },
    );
    expect(actual).toEqual(expected.entries);
    expect(changedFiles).toBe(15);
    expect(semanticMaps).toBe(6);
  });

  it("preserves all four delivered definitions and complete Published bundles from f8cdfe81", () => {
    const expected = JSON.parse(
      readFileSync(
        new URL("./fixtures/definition-data-baseline.json", import.meta.url),
        "utf8",
      ),
    );
    expect(expected.base).toBe("f8cdfe812c6c5ab2710a641862aa8f026134ab15");
    const actual = currentDefinitionDataCompatibility();
    expect(actual).toHaveLength(4);
    expect(actual).toEqual(expected.entries);
  });
});

describe("strict protected baseline inverse comparison", () => {
  const current = new Map<string, readonly GeneratedFile[]>();
  const oldDigests = new Map<string, string>();
  const error = "Legacy database identifier comparison failed.";
  beforeAll(() => {
    const expected = JSON.parse(
      readFileSync(
        new URL("./fixtures/five-definition-baseline.json", import.meta.url),
        "utf8",
      ),
    );
    currentDefinitionDataCompatibility(
      expected.entries.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
      (key, files) => current.set(key, files),
    );
    for (const entry of expected.entries)
      oldDigests.set(
        entry.definitionKey,
        entry.separatePublishedLockBundle.sha256,
      );
  });
  function changed(
    key: string,
    transform: (content: string, path: string) => string,
  ) {
    return current.get(key)!.map((file) => ({
      ...file,
      content: transform(file.content, file.path),
    }));
  }
  function checkReject(
    files: readonly GeneratedFile[],
    key = "expense-approval",
  ) {
    expect(() => definitionDatabaseIdentifierComparison(files, key)).toThrow(
      error,
    );
  }
  it.each([
    "missing",
    "duplicate",
    "seventh",
    "changed name",
    "unpaired",
    "schema copy mismatch",
    "schema role",
    "SQL role",
  ])("rejects a %s map", (mutation) => {
    const key = "expense-approval";
    const files = current.get(key)!;
    const schema = files.find(
      (file) => file.path === IDENTIFIER_DATABASE_PATHS[0],
    )!.content;
    const mapName = /map: "([^"]+)"/.exec(schema)![1]!;
    const mappedLine = schema
      .split("\n")
      .find((line) => line.includes(`map: "${mapName}"`))!;
    const bad = changed(key, (content, path) => {
      const isSchema =
        path === IDENTIFIER_DATABASE_PATHS[0] ||
        path === IDENTIFIER_DATABASE_PATHS[1];
      if (mutation === "changed name")
        return content.replaceAll(mapName, "changed_fk_0000000000000000");
      if (mutation === "unpaired" && path === IDENTIFIER_DATABASE_PATHS[2])
        return content.replace(mapName, "unpaired_fk_0000000000000000");
      if (
        mutation === "schema copy mismatch" &&
        path === IDENTIFIER_DATABASE_PATHS[1]
      )
        return content + "\n";
      if (mutation === "SQL role" && path === IDENTIFIER_DATABASE_PATHS[2])
        return content.replace(
          /ALTER TABLE "[^"]+"(?= ADD CONSTRAINT "[^"\n]+_fk_)/,
          'ALTER TABLE "Factory_AuditEvent"',
        );
      if (!isSchema) return content;
      if (mutation === "missing")
        return content.replace(`, map: "${mapName}"`, "");
      if (mutation === "duplicate")
        return content.replace(mappedLine, `${mappedLine}\n${mappedLine}`);
      if (mutation === "seventh")
        return content.replace(
          mappedLine,
          `${mappedLine}\n  @@index([subjectRef], map: "unexpected_ix_0000000000000000")`,
        );
      if (mutation === "schema role")
        return content
          .replace(mappedLine + "\n", "")
          .replace(/(model \w+ \{\n)/, `$1${mappedLine}\n`);
      return content;
    });
    checkReject(bad);
  });
  it("rejects a mapped Purchase index moved to another model", () => {
    const key = "purchase-request-approval";
    checkReject(
      changed(key, (content, path) => {
        if (!path.endsWith("schema.prisma")) return content;
        const line = content
          .split("\n")
          .find((line) => line.includes("@@index") && line.includes("map:"))!;
        return content
          .replace(line + "\n", "")
          .replace(/(model \w+ \{\n)/, `$1${line}\n`);
      }),
      key,
    );
  });
  it("rejects an unknown fixture instead of inferring a normalization rule", () => {
    checkReject(current.get("expense-approval")!, "unknown");
  });
  it.each(["non-database byte", "database whitespace"])(
    "leaves an unrelated %s visible to the original complete-bundle digest",
    (mutation) => {
      const key = "expense-approval";
      const untouchedPath = current
        .get(key)!
        .find(
          (file) => !new Set<string>(IDENTIFIER_DATABASE_PATHS).has(file.path),
        )!.path;
      const input = changed(key, (content, path) =>
        mutation === "non-database byte"
          ? path === untouchedPath
            ? content + "\n"
            : content
          : path.endsWith("schema.prisma")
            ? content + "\n"
            : content,
      );
      const comparison = definitionDatabaseIdentifierComparison(input, key);
      const digest = createHash("sha256")
        .update(
          JSON.stringify(
            comparison.map(({ path, content }) => [path, content]),
          ),
        )
        .digest("hex");
      expect(digest).not.toBe(oldDigests.get(key));
      if (mutation === "non-database byte")
        expect(
          comparison.find((file) => file.path === untouchedPath)!.content,
        ).toBe(input.find((file) => file.path === untouchedPath)!.content);
    },
  );
});
