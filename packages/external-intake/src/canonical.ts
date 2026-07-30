import { createHash } from "node:crypto";

export type Sha256Digest = `sha256:${string}`;

function canonicalize(input: unknown, ancestors: WeakSet<object>): string {
  if (input === null) {
    return "null";
  }

  switch (typeof input) {
    case "boolean":
    case "string":
      return JSON.stringify(input);
    case "number":
      if (!Number.isFinite(input)) {
        throw new TypeError("Canonical JSON accepts only finite numbers.");
      }
      return JSON.stringify(input);
    case "object":
      break;
    default:
      throw new TypeError(`Canonical JSON cannot represent ${typeof input}.`);
  }

  if (ancestors.has(input)) {
    throw new TypeError("Canonical JSON cannot represent cyclic objects.");
  }
  ancestors.add(input);

  try {
    if (Array.isArray(input)) {
      const entries: string[] = [];
      for (let index = 0; index < input.length; index += 1) {
        if (!(index in input)) {
          throw new TypeError("Canonical JSON cannot represent sparse arrays.");
        }
        entries.push(canonicalize(input[index], ancestors));
      }
      return `[${entries.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(input) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Canonical JSON accepts only plain objects.");
    }

    const object = input as Record<string, unknown>;
    const entries = Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalize(object[key], ancestors)}`,
      );
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(input);
  }
}

export function canonicalJson(input: unknown): string {
  return canonicalize(input, new WeakSet<object>());
}

export function digestBytes(bytes: Uint8Array): Sha256Digest {
  const hexadecimal = createHash("sha256").update(bytes).digest("hex");
  return `sha256:${hexadecimal}`;
}

export function canonicalRecordDigest(input: unknown): Sha256Digest {
  return digestBytes(new TextEncoder().encode(canonicalJson(input)));
}
