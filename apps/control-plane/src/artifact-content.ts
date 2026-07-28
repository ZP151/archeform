import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type RegisteredGeneratedArtifact = {
  readonly rootDirectory: string;
  readonly path: string;
  readonly digest: string;
};

export type GeneratedArtifactContent = {
  readonly path: string;
  readonly digest: string;
  readonly content: string;
};

const maximumSourceBytes = 1_000_000;

function isSafeRootDirectory(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    value
      .split("/")
      .every(
        (segment) => segment.length > 0 && segment !== "." && segment !== "..",
      )
  );
}

function isInside(parent: string, candidate: string): boolean {
  const fromParent = relative(parent, candidate);
  return (
    fromParent !== "" &&
    !fromParent.startsWith(`..${sep}`) &&
    fromParent !== ".." &&
    !isAbsolute(fromParent)
  );
}

/**
 * Reads only an Artifact row that has already been registered by the Worker.
 * The content is re-hashed to make an altered volume fail closed before it can
 * become a Code Studio source snapshot.
 */
export class GeneratedArtifactReader {
  constructor(
    private readonly artifactRoot = process.env.FACTORY_ARTIFACT_ROOT ??
      "generated",
  ) {}

  async read(
    artifact: RegisteredGeneratedArtifact,
  ): Promise<GeneratedArtifactContent> {
    if (!isSafeRootDirectory(artifact.rootDirectory)) {
      throw new Error(
        "Generated artifact root must be a single safe directory.",
      );
    }
    if (!isSafeRelativePath(artifact.path)) {
      throw new Error("Generated artifact path must be a safe relative path.");
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(artifact.digest)) {
      throw new Error("Generated artifact digest must be a SHA-256 value.");
    }

    const root = resolve(this.artifactRoot, artifact.rootDirectory);
    const destination = resolve(root, artifact.path);
    if (!isInside(root, destination)) {
      throw new Error(
        "Generated artifact path is outside its registered root.",
      );
    }
    const bytes = await readFile(destination);
    if (bytes.byteLength > maximumSourceBytes) {
      throw new Error("Generated artifact is too large to inspect safely.");
    }
    const content = bytes.toString("utf8");
    const actualDigest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (actualDigest !== artifact.digest) {
      throw new Error(
        "Generated artifact digest does not match registered evidence.",
      );
    }
    return { path: artifact.path, digest: artifact.digest, content };
  }
}
