import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { GeneratedApplicationBundle } from "@factory/compiler";

export interface MaterializedArtifact {
  readonly path: string;
  readonly digest: string;
  readonly sizeBytes: number;
}

export interface MaterializedBundle {
  readonly directory: string;
  readonly graphHash: string;
  readonly artifacts: readonly MaterializedArtifact[];
}

function isInside(parent: string, candidate: string): boolean {
  const fromParent = relative(parent, candidate);
  return fromParent !== "" && !fromParent.startsWith(`..${sep}`) && fromParent !== ".." && !isAbsolute(fromParent);
}

function safeBundleRoot(outputDirectory: string, rootDirectory: string): string {
  if (!rootDirectory || rootDirectory.includes("/") || rootDirectory.includes("\\") || rootDirectory === "." || rootDirectory === "..") {
    throw new Error("Generated application root must be a single directory name.");
  }
  return resolve(outputDirectory, rootDirectory);
}

/**
 * The Worker is the only filesystem writer. It prevents a Graph, adapter, or
 * future compiler target from escaping its isolated generated-app directory.
 */
export async function materializeGeneratedBundle(
  outputDirectory: string,
  bundle: GeneratedApplicationBundle,
): Promise<MaterializedBundle> {
  const directory = safeBundleRoot(outputDirectory, bundle.rootDirectory);
  await mkdir(directory, { recursive: true });
  const artifacts: MaterializedArtifact[] = [];

  for (const file of bundle.files) {
    const destination = resolve(directory, file.path);
    if (!isInside(directory, destination)) {
      throw new Error(`Generated file '${file.path}' is outside the isolated application directory.`);
    }
    await mkdir(resolve(destination, ".."), { recursive: true });
    await writeFile(destination, file.content, "utf8");
    const bytes = Buffer.byteLength(file.content, "utf8");
    artifacts.push({
      path: file.path,
      digest: `sha256:${createHash("sha256").update(file.content).digest("hex")}`,
      sizeBytes: bytes,
    });
  }

  return { directory, graphHash: bundle.graphHash, artifacts };
}
