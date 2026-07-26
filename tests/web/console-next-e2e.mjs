import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { startFixtureControlPlane } from './fixture-control-plane.mjs';

const root = process.cwd();
const consoleRoot = join(root, 'apps', 'console-next');
const closurePath = join(
  root,
  'packages',
  'vendor',
  'shadcn-ui',
  '7774cd7dcee1e98d0815aa6e829f33a7fc952fdf',
  'console-next-closure.json',
);

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const target = join(path, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

function sha256(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function assertPackageAndSourceOrigin() {
  assert.equal(existsSync(join(consoleRoot, 'package.json')), true, 'Console Next package must exist');
  assert.equal(existsSync(join(consoleRoot, 'package-lock.json')), true, 'Console Next lockfile must exist');
  const pkg = JSON.parse(readFileSync(join(consoleRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.next, '15.5.21');
  assert.equal(pkg.dependencies.react, '19.2.7');
  assert.equal(pkg.dependencies['react-dom'], '19.2.7');
  assert.match(pkg.scripts.dev, /127\.0\.0\.1/);
  assert.match(pkg.scripts.dev, /5173/);

  const closure = JSON.parse(readFileSync(closurePath, 'utf8'));
  assert.match(closure.lockfile.consoleNextLockDigest || '', /^sha256:[a-f0-9]{64}$/);
  const primitiveSources = new Map(
    closure.primitives.flatMap((primitive) => primitive.files.map((file) => [primitive.name, file.sha256])),
  );
  const uiRoot = join(consoleRoot, 'components', 'ui');
  const uiFiles = files(uiRoot).filter((path) => path.endsWith('.tsx'));
  assert.equal(uiFiles.length, primitiveSources.size, 'only approved primitive files may be copied');
  for (const path of uiFiles) {
    const name = relative(uiRoot, path).replace(/\.tsx$/, '');
    assert.equal(primitiveSources.has(name), true, `${name} must be an approved primitive`);
    assert.equal(sha256(path), primitiveSources.get(name), `${name} must match its verified source digest`);
  }
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`Console Next stopped before startup (exit ${child.exitCode}).`);
    try { if ((await fetch(url)).ok) return; } catch { /* wait for the dev server */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Console Next did not start within 20 seconds.');
}

async function runWorkflow() {
  const fixture = await startFixtureControlPlane();
  const port = Number(process.env.FACTORY_CONSOLE_PORT || '5173');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FACTORY_CONSOLE_PORT must be a loopback TCP port.');
  const nextBin = join(consoleRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = process.env.FACTORY_CONSOLE_REUSE === '1'
    ? null
    : spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: consoleRoot, stdio: 'ignore' });
  const require = createRequire(import.meta.url);
  let playwright;
  try { playwright = require('playwright'); } catch { playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
  const consoleUrl = `http://127.0.0.1:${port}/`;
  await waitForServer(consoleUrl, server);
  console.log(`console-next workflow: server ready on ${port}`);
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.addInitScript((base) => { window.FACTORY_API_BASE = base; }, fixture.base);
  try {
    await page.goto(consoleUrl);
    console.log('console-next workflow: browser ready');
    await page.getByRole('button', { name: 'Local connection' }).click();
    await page.getByLabel('Local session capability').fill(fixture.token);
    await page.getByRole('button', { name: 'Use local capability' }).click();
    await page.getByRole('heading', { name: 'Local connection' }).waitFor({ state: 'hidden', timeout: 2000 });
    await page.getByLabel('Project name').fill('expense-approval');
    await page.getByLabel('Requirement brief').fill('Employees submit expenses and managers approve them.');
    await page.getByRole('button', { name: 'Generate application definition' }).click();
    await page.getByRole('heading', { name: 'Application definition' }).waitFor();
    console.log('console-next workflow: definition created');
    await page.getByLabel('Primary record label').fill('Expense claim');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByText('Version 2 · draft').waitFor();
    console.log('console-next workflow: child version created');
    await page.getByRole('button', { name: 'Approve application definition' }).click();
    await page.getByRole('button', { name: 'Create build plan' }).click();
    await page.getByText('Fixture planner unavailable. Retry the build plan.').waitFor();
    await page.getByRole('button', { name: 'Retry build plan' }).click();
    await page.getByRole('heading', { name: 'Build plan' }).waitFor();
    console.log('console-next workflow: plan retried');
    await page.getByText('backend.fastapi-crud', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Approve build plan' }).click();
    await page.getByRole('button', { name: 'Queue local build' }).click();
    await page.getByText('ready', { exact: true }).waitFor({ timeout: 8000 });
    console.log('console-next workflow: preview ready');
    const preview = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Open preview' }).click();
    await (await preview).close();
    await page.getByRole('button', { name: 'Stop preview' }).click();
    await page.getByRole('button', { name: 'Confirm stop preview' }).click();
    await page.getByText('stopped', { exact: true }).waitFor({ timeout: 8000 });
    assert.equal(fixture.state.planAttempts, 2, 'the retry control must create a second plan request');
    console.log('console-next workflow: PASS');
  } finally {
    await browser.close();
    server?.kill();
    await fixture.close();
  }
}

if (process.argv.includes('--assert-package-only')) {
  assertPackageAndSourceOrigin();
  console.log('console-next package/source origin: PASS');
} else {
  assertPackageAndSourceOrigin();
  await runWorkflow();
}
