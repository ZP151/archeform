import { z } from "zod";

import {
  CompositionError,
  graphKeySchema,
  parseStrict,
  sha256DigestSchema,
} from "./composition-shared.js";
import type { Sha256Digest } from "./product-intent.js";

const typedSha256DigestSchema = sha256DigestSchema as z.ZodType<Sha256Digest>;
const windowsInvalidSegmentPattern = /[\u0000-\u001f\u007f<>:"|?*~]/;
const windowsDeviceStemPattern =
  /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\.|$)/i;

const safeRelativePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine((value) => {
    if (
      value.includes("\\") ||
      value.startsWith("/") ||
      /^[a-zA-Z]:/.test(value) ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
    ) {
      return false;
    }
    const segments = value.split("/");
    return segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !windowsInvalidSegmentPattern.test(segment) &&
        !segment.endsWith(".") &&
        !segment.endsWith(" ") &&
        !windowsDeviceStemPattern.test(segment),
    );
  }, "Overlay path is invalid or unsafe.");

export const sourceOverlaySchema = z
  .object({
    apiVersion: z.literal("factory.source-overlay/v1"),
    compilationChecksum: typedSha256DigestSchema,
    baselineDigest: typedSha256DigestSchema,
    writableRoots: z.tuple([z.literal("src/extensions")]),
    declaredSlots: z.array(
      z
        .object({
          key: graphKeySchema,
          file: safeRelativePathSchema,
          exportName: z
            .string()
            .min(1)
            .max(128)
            .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
        })
        .strict(),
    ),
    files: z.array(
      z
        .object({
          path: safeRelativePathSchema,
          baseDigest: typedSha256DigestSchema,
          contentDigest: typedSha256DigestSchema,
        })
        .strict(),
    ),
    conflictState: z.enum(["clean", "stale-baseline", "slot-removed"]),
  })
  .strict();

export type SourceOverlayV1 = z.infer<typeof sourceOverlaySchema>;

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new CompositionError(`${label} '${value}' is duplicated.`);
    }
    seen.add(value);
  }
}

function isReservedOverlayPath(path: string): boolean {
  const basename = path.split("/").at(-1)!;
  return (
    basename === "package.json" ||
    basename === "package-lock.json" ||
    basename === "pnpm-lock.yaml" ||
    basename === "pnpm-lock.yml" ||
    basename === "yarn.lock" ||
    basename === "bun.lock" ||
    basename === "bun.lockb" ||
    basename === ".npmrc" ||
    basename.startsWith(".yarnrc") ||
    basename.startsWith("tsconfig.") ||
    basename.startsWith("jsconfig.") ||
    basename.includes(".config.") ||
    /^(?:main|index|app|server|cli)\.(?:[cm]?[jt]sx?|html)$/.test(basename)
  );
}

function windowsPathKey(path: string): string {
  return path.toLowerCase();
}

function assertWritableOverlayPath(path: string): void {
  const canonicalPath = windowsPathKey(path);
  if (!canonicalPath.startsWith("src/extensions/")) {
    throw new CompositionError(
      `Source Overlay path '${path}' is outside its writable root.`,
    );
  }
  if (isReservedOverlayPath(canonicalPath)) {
    throw new CompositionError(
      `Source Overlay path '${path}' is an unsafe package, lock, configuration, or entry file.`,
    );
  }
}

export function assertSourceOverlay(input: unknown): SourceOverlayV1 {
  const overlay = parseStrict(sourceOverlaySchema, input);
  assertUnique(
    overlay.declaredSlots.map(({ key }) => key),
    "Source Overlay slot key",
  );
  assertUnique(
    overlay.declaredSlots.map(({ file }) => windowsPathKey(file)),
    "Source Overlay slot file",
  );
  assertUnique(
    overlay.files.map(({ path }) => windowsPathKey(path)),
    "Source Overlay file path",
  );
  for (const slot of overlay.declaredSlots) {
    assertWritableOverlayPath(slot.file);
  }
  for (const file of overlay.files) {
    assertWritableOverlayPath(file.path);
  }
  return overlay;
}
