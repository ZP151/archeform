import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const directory = "docs/acceptance/evidence/definition-batch-one";
const factory = "factory-t9-definition-batch-20260913";
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

if (process.argv[2] === "snapshot") {
  const container = docker(
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factory}`,
    "--filter",
    "label=com.docker.compose.service=control-plane",
    "--quiet",
  );
  assert.match(container, /^[a-f0-9]+$/);
  const source = `const {PrismaClient}=require('/workspace/apps/control-plane/node_modules/@prisma/client');
const db=new PrismaClient();
(async()=>{try {
const compilations=await db.compilation.findMany({select:{id:true}});
const previews=await db.previewRun.findMany({select:{id:true,compilationId:true,status:true,composeProjectName:true}});
const verifications=await db.verificationRun.findMany({select:{verificationRunId:true,compilationId:true,status:true}});
console.log(JSON.stringify({compilations,previews,verifications}));
}finally{await db.$disconnect();}})().catch(()=>{process.exitCode=1;});`;
  const snapshot = JSON.parse(docker("exec", container, "node", "-e", source));
  assert.ok(snapshot.previews.length >= 3);
  assert.ok(snapshot.previews.every((row) => row.status === "stopped"));
  writeFileSync(
    `${directory}/runtime-runs.json`,
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  console.log(
    "PASS: persisted task Preview runs stopped; safe run identities recorded.",
  );
} else {
  const snapshot = JSON.parse(
    readFileSync(`${directory}/runtime-runs.json`, "utf8"),
  );
  const projects = [
    ...new Set([
      factory,
      "factory-t9-definition-batch-diagnostic",
      ...snapshot.previews.map((row) => row.composeProjectName),
      ...snapshot.verifications.map(
        (row) => `factory-preview-preview-${row.verificationRunId}`,
      ),
    ]),
  ];
  const resources = projects.map((project) => {
    assert.match(
      project,
      /^(factory-t9-definition-batch-(20260913|diagnostic)|factory-preview-preview-[a-z0-9-]+)$/,
    );
    const counts = {};
    for (const kind of ["container", "network", "volume"]) {
      const output = docker(
        kind,
        "ls",
        ...(kind === "container" ? ["--all"] : []),
        "--filter",
        `label=com.docker.compose.project=${project}`,
        "--quiet",
      );
      counts[kind] = output ? output.split(/\r?\n/).length : 0;
      assert.equal(counts[kind], 0, `${project}: remaining ${kind}`);
    }
    return { project, ...counts };
  });
  writeFileSync(
    `${directory}/cleanup.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        method:
          "Exact task Compose labels, including stopped containers and verifier projects; no unrelated resources changed",
        resources,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `PASS: ${resources.length} exact projects have zero containers, networks and volumes.`,
  );
}
