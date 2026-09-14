import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const directory = "docs/acceptance/evidence/consumer-task-correction";
const readJson = (path) =>
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const previous = readJson(`${directory}/runtime-identity-attempt-2.json`);
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8", windowsHide: true }).trim();
const digest = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const project = "factory-t9-task-correction-20260913";
const images = previous.images.map((entry) => {
  const container = `${project}-${entry.service}-1`;
  const paths = Object.keys(entry.sources);
  if (entry.service === "compiler-worker")
    paths.push("apps/compiler-worker/src/verifier/probes.ts");
  const sources = {};
  for (const path of paths) {
    const actual = docker(
      "exec",
      container,
      "node",
      "-e",
      'const fs=require("node:fs"),c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"));',
      `/workspace/${path}`,
    );
    if (actual !== digest(path))
      throw new Error(`Source mismatch: ${entry.service}/${path}`);
    sources[path] = actual;
  }
  return {
    service: entry.service,
    image: docker("inspect", "--format", "{{.Image}}", container),
    sourceFilesMatched: paths.length,
    sources,
  };
});
for (const name of [
  "source-identity.json",
  "acceptance-source-identity.json",
]) {
  const manifest = readJson(`${directory}/${name}`);
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (digest(path) !== expected)
      throw new Error(`Manifest mismatch: ${path}`);
  }
}
writeFileSync(
  `${directory}/runtime-identity.json`,
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      base: previous.base,
      project,
      images,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `PASS: ${images.map((image) => `${image.service} ${image.sourceFilesMatched}`).join(", ")} source files match running images; both local manifests match.`,
);
