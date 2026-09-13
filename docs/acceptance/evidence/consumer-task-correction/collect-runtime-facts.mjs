import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const project = 'factory-t9-task-correction-20260913';
const script = `import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const verificationRuns = await p.verificationRun.findMany({
    orderBy: { createdAt: 'asc' },
    select: { verificationRunId: true, compilationId: true, status: true, evidence: true }
  });
  const previewRuns = await p.previewRun.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, compilationId: true, composeProjectName: true, status: true }
  });
  console.log(JSON.stringify({ verificationRuns, previewRuns }));
} finally { await p.$disconnect(); }`;
const result = JSON.parse(execFileSync('docker', [
  'exec', '-w', '/workspace/apps/control-plane', `${project}-control-plane-1`,
  'node', '--input-type=module', '-e', script,
], { encoding: 'utf8', windowsHide: true }));
const projects = [
  'factory-task-correction-20260913', project,
  ...result.verificationRuns.map((run) => `factory-preview-preview-${run.verificationRunId}`),
  ...result.previewRuns.map((run) => run.composeProjectName),
];
if (projects.some((name) => !/^factory-[a-z0-9-]+$/.test(name))) throw new Error('Invalid exact project identity');
writeFileSync('docs/acceptance/evidence/consumer-task-correction/runtime-facts.json',
  JSON.stringify({ recordedAt: new Date().toISOString(), ...result, projects: [...new Set(projects)] }, null, 2) + '\n');
console.log(`Recorded ${result.verificationRuns.length} bounded verification runs, ${result.previewRuns.length} Preview runs and ${new Set(projects).size} exact project identities.`);
