import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { startFixtureControlPlane } from './fixture-control-plane.mjs';

const root = process.cwd();
const consoleRoot = join(root, 'apps', 'console-next');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}

function assertRuntimeContainment() {
  const files = sourceFiles(join(consoleRoot, 'app'))
    .concat(sourceFiles(join(consoleRoot, 'components')))
    .concat(sourceFiles(join(consoleRoot, 'lib')))
    .concat([join(consoleRoot, 'next.config.mjs')]);
  const prohibited = [
    /npx\s+(?:shadcn|@?shadcn-ui)/i,
    /shadcn(?:\.com|\/cli|\s+cli)/i,
    /(?:registry\.)?npmjs\.org/i,
    /github\.com/i,
    /\b(?:child_process|execSync|spawnSync|subprocess)\b/i,
    /\b(?:npm|pnpm|yarn)\s+(?:install|add|exec|dlx)\b/i,
    /\bgit\s+(?:clone|fetch|checkout|pull)\b/i,
  ];
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    for (const pattern of prohibited) {
      assert.equal(pattern.test(source), false, `${path} must not resolve third-party source at runtime (${pattern}).`);
    }
  }

  const apiPath = join(consoleRoot, 'lib', 'factory-api.ts');
  const api = readFileSync(apiPath, 'utf8');
  assert.equal((api.match(/\bfetch\s*\(/g) || []).length, 2, 'only FactoryApi may make the two bounded API fetch calls.');
  for (const path of files.filter((path) => path !== apiPath)) {
    assert.equal(/\bfetch\s*\(/.test(readFileSync(path, 'utf8')), false, `${path} must not make network calls outside FactoryApi.`);
  }
  const urls = [...api.matchAll(/https?:\/\/[^\s'"`)}]+/g)].map((match) => match[0]);
  assert.deepEqual(urls, ['http://127.0.0.1:8080/api'], 'FactoryApi must default only to the loopback Factory API.');
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Console Next stopped before startup (exit ${child.exitCode}).`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The local development server has not started yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Console Next did not start within 20 seconds.');
}

async function expectFocused(page, locator, message) {
  await locator.focus();
  assert.equal(await locator.evaluate((element) => document.activeElement === element), true, message);
}

async function runAccessibilityEvidence() {
  assert.equal(existsSync(join(consoleRoot, 'package-lock.json')), true, 'the checked-in Console Next lockfile is required.');
  assertRuntimeContainment();

  const fixture = await startFixtureControlPlane();
  const port = Number(process.env.FACTORY_CONSOLE_PORT || '5173');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FACTORY_CONSOLE_PORT must be a loopback TCP port.');
  const nextBin = join(consoleRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: consoleRoot,
    stdio: 'ignore',
  });
  const require = createRequire(import.meta.url);
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  }
  const consoleUrl = `http://127.0.0.1:${port}/`;
  await waitForServer(consoleUrl, server);
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript((base) => { window.FACTORY_API_BASE = base; }, fixture.base);

  try {
    await page.goto(consoleUrl);
    const connection = page.getByRole('button', { name: 'Local connection' });
    await expectFocused(page, connection, 'the connection trigger must be keyboard focusable.');
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Local connection' }).waitFor();
    const capability = page.getByLabel('Local session capability');
    await expectFocused(page, capability, 'opening the connection Sheet must move focus to its labelled control.');
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: 'Local connection' }).waitFor({ state: 'hidden' });
    assert.equal(await connection.evaluate((element) => document.activeElement === element), true, 'closing the Sheet must restore focus to its trigger.');

    await connection.focus();
    await page.keyboard.press('Enter');
    await capability.fill(fixture.token);
    await page.getByRole('button', { name: 'Use local capability' }).click();
    const status = page.getByRole('status');
    await status.waitFor();
    assert.equal(await status.getAttribute('aria-live'), 'polite', 'progress notices must be announced politely.');
    await assertAllFormControlsAreLabelled(page);

    await page.getByLabel('Project name').fill('accessibility-expense-approval');
    await page.getByLabel('Requirement brief').fill('Employees submit expenses and managers approve them.');
    await page.getByRole('button', { name: 'Generate application definition' }).click();
    await page.getByRole('heading', { name: 'Application definition' }).waitFor();
    assert.match(await status.textContent() || '', /structured definition is ready/i);

    const navigation = page.getByRole('button', { name: 'New project' });
    await expectFocused(page, navigation, 'the product-lineage navigation control must be keyboard focusable.');
    const definitionTab = page.getByRole('tab', { name: /02 Application definition/ });
    await expectFocused(page, definitionTab, 'the active workflow stage Tab must be keyboard focusable.');
    await page.getByLabel('Primary record label').fill('Expense claim');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByRole('button', { name: 'Approve application definition' }).click();
    await page.getByRole('button', { name: 'Create build plan' }).click();
    await page.getByRole('button', { name: 'Retry build plan' }).waitFor();
    await page.getByRole('button', { name: 'Retry build plan' }).click();
    await page.getByRole('button', { name: 'Approve build plan' }).click();
    await page.getByRole('button', { name: 'Queue local build' }).click();
    await page.getByText('ready', { exact: true }).waitFor({ timeout: 8000 });

    const stop = page.getByRole('button', { name: 'Stop preview' });
    await expectFocused(page, stop, 'the stop-preview control must be keyboard focusable.');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Confirm stop preview' }).isVisible(), true, 'the confirmation Dialog must expose its action.');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await stop.evaluate((element) => document.activeElement === element), true, 'closing the Dialog must restore focus to its trigger.');

    const diagnostics = page.getByRole('button', { name: 'Bounded log and diagnostics' });
    await expectFocused(page, diagnostics, 'the diagnostic Accordion trigger must be keyboard focusable.');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.evidence').last().isVisible(), true, 'the diagnostic Accordion must be keyboard expandable.');
  } finally {
    await browser.close();
    server.kill();
    await fixture.close();
  }
}

async function assertAllFormControlsAreLabelled(page) {
  for (const label of ['Project name', 'Requirement brief']) {
    assert.equal(await page.getByLabel(label).count(), 1, `${label} must have exactly one accessible label.`);
  }
}

await runAccessibilityEvidence();
console.log('console-next accessibility and runtime containment: PASS');
