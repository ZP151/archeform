import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
import { startFixtureControlPlane } from './fixture-control-plane.mjs';

const root = process.cwd();
const workspaceConsoleRoot = join(root, 'apps', 'console-next');
const workspaceNextEnvPath = join(workspaceConsoleRoot, 'next-env.d.ts');
const workspaceNodeModules = join(workspaceConsoleRoot, 'node_modules');

function isOwnedTemporaryChild(candidate, label) {
  const tempRoot = realpathSync(tmpdir());
  const realCandidate = realpathSync(candidate);
  const relation = relative(tempRoot, realCandidate);
  assert.ok(relation && !relation.startsWith('..') && !isAbsolute(relation), `${label} must stay below the OS temp root.`);
  assert.equal(dirname(realCandidate), tempRoot, `${label} must be a direct child of the OS temp root.`);
  assert.ok(basename(realCandidate).startsWith('factory-pilot-console-'), `${label} must have the owned temp prefix.`);
  return realCandidate;
}

function assertNoCopiedBuildOutput(directory, label) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    assert.equal(entry.name === '.next' || entry.name.startsWith('.next-'), false, `${label} must exclude ${entry.name}.`);
    if (entry.isDirectory()) assertNoCopiedBuildOutput(join(directory, entry.name), label);
  }
}

function createIsolatedConsoleCopy(label) {
  assert.notEqual(process.env.FACTORY_CONSOLE_REUSE, '1', 'isolated Console tests must not reuse a user service.');
  const workspaceNextEnvBefore = readFileSync(workspaceNextEnvPath);
  const temporaryParent = mkdtempSync(join(tmpdir(), 'factory-pilot-console-'));
  let linkedDependencies = false;
  try {
    const ownedParent = isOwnedTemporaryChild(temporaryParent, `${label} temporary parent`);
    const copyRoot = join(ownedParent, 'console-next');
    cpSync(workspaceConsoleRoot, copyRoot, {
      recursive: true,
      filter(source) {
        const name = basename(source);
        return name !== 'node_modules' && name !== '.next' && !name.startsWith('.next-');
      },
    });
    assert.notEqual(realpathSync(copyRoot), realpathSync(workspaceConsoleRoot), `${label} copy must not resolve to the workspace Console.`);
    for (const required of ['package.json', 'package-lock.json', 'next-env.d.ts']) {
      assert.equal(existsSync(join(copyRoot, required)), true, `${label} copy must contain ${required}.`);
    }
    assert.deepEqual(readFileSync(join(copyRoot, 'next-env.d.ts')), workspaceNextEnvBefore, `${label} copy must start with the workspace next-env.d.ts bytes.`);
    assertNoCopiedBuildOutput(copyRoot, `${label} copy`);
    const copyNodeModules = join(copyRoot, 'node_modules');
    assert.equal(existsSync(copyNodeModules), false, `${label} copy must not copy node_modules.`);
    symlinkSync(realpathSync(workspaceNodeModules), copyNodeModules, process.platform === 'win32' ? 'junction' : 'dir');
    linkedDependencies = true;
    assert.equal(lstatSync(copyNodeModules).isSymbolicLink(), true, `${label} dependencies must be a local link.`);
    assert.equal(realpathSync(copyNodeModules), realpathSync(workspaceNodeModules), `${label} dependencies must resolve to the locked workspace node_modules.`);
    assert.deepEqual(readFileSync(workspaceNextEnvPath), workspaceNextEnvBefore, `${label} setup must not change workspace next-env.d.ts.`);
    const distDir = `.next-test-${label.replace(/[^A-Za-z0-9_-]/g, '-')}-${process.pid}-${Math.random().toString(16).slice(2)}`;
    let removed = false;
    return {
      copyRoot,
      distDir,
      workspaceNextEnvBefore,
      removeOwnedCopy() {
        assert.equal(removed, false, `${label} temporary copy must be removed at most once.`);
        const validatedParent = isOwnedTemporaryChild(temporaryParent, `${label} temporary parent cleanup`);
        assert.equal(realpathSync(copyRoot), join(validatedParent, 'console-next'), `${label} copy root must remain inside its owned temporary parent.`);
        assert.equal(realpathSync(copyNodeModules), realpathSync(workspaceNodeModules), `${label} cleanup must unlink only the locked dependency link.`);
        unlinkSync(copyNodeModules);
        assert.equal(existsSync(workspaceNodeModules), true, `${label} cleanup must preserve workspace node_modules.`);
        rmSync(validatedParent, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        assert.equal(existsSync(validatedParent), false, `${label} cleanup must remove its validated temporary parent.`);
        removed = true;
      },
    };
  } catch (error) {
    const validatedParent = isOwnedTemporaryChild(temporaryParent, `${label} failed temporary parent cleanup`);
    const copyNodeModules = join(validatedParent, 'console-next', 'node_modules');
    if (linkedDependencies && existsSync(copyNodeModules)) unlinkSync(copyNodeModules);
    rmSync(validatedParent, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    throw error;
  }
}

function assertWorkspaceNextEnvUnchanged(runner, label) {
  assert.deepEqual(readFileSync(workspaceNextEnvPath), runner.workspaceNextEnvBefore, `${label} must not change workspace next-env.d.ts.`);
}

function assertValidatedIsolatedRunner(runner, label) {
  const copyRoot = realpathSync(runner.copyRoot);
  assert.notEqual(copyRoot, realpathSync(workspaceConsoleRoot), `${label} cleanup must never target the workspace Console.`);
  const ownedParent = isOwnedTemporaryChild(dirname(copyRoot), `${label} cleanup parent`);
  assert.equal(copyRoot, join(ownedParent, 'console-next'), `${label} cleanup must target only its copied Console root.`);
  assert.equal(realpathSync(join(copyRoot, 'node_modules')), realpathSync(workspaceNodeModules), `${label} cleanup must retain only the locked dependency link.`);
}

function ownedRootExists(ownedPid, label) {
  try {
    process.kill(ownedPid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw new Error(`${label} root PID existence could not be verified; refusing cleanup.`, { cause: error });
  }
}

async function terminateOwnedProcessTree(server, label, lifecycle, runTerminationCommand = spawnSync) {
  if (!server) return { degradedTreeTermination: false };
  const ownedPid = server.pid;
  if (!Number.isInteger(ownedPid) || ownedPid <= 0) throw new Error(`${label} runner has no exact spawned root PID; refusing cleanup.`);
  if (!ownedRootExists(ownedPid, label)) throw new Error(`${label} root PID was already absent before owned tree termination; refusing cleanup.`);
  lifecycle?.push('owned-root-present');
  let nonzeroTaskkillStatus = null;
  if (process.platform === 'win32') {
    const termination = runTerminationCommand('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    if (termination.error) throw new Error(`${label} owned process-tree termination could not be invoked; refusing cleanup.`, { cause: termination.error });
    if (termination.status === 0) lifecycle?.push('tree-termination-succeeded');
    else nonzeroTaskkillStatus = { status: termination.status, stderr: termination.stderr?.trim() || 'no stderr' };
  } else {
    server.kill();
    lifecycle?.push('tree-termination-requested');
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!ownedRootExists(ownedPid, label)) {
      lifecycle?.push('owned-root-absent');
      return { degradedTreeTermination: nonzeroTaskkillStatus !== null };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (nonzeroTaskkillStatus) throw new Error(`${label} taskkill exited with status ${String(nonzeroTaskkillStatus.status)} (${nonzeroTaskkillStatus.stderr}); refusing cleanup because the exact owned root PID remains.`);
  throw new Error(`${label} root PID still exists after owned tree termination; refusing cleanup.`);
}

async function cleanupOwnedConsoleHarness(server, runner, label, lifecycle, runTerminationCommand = spawnSync) {
  assertValidatedIsolatedRunner(runner, label);
  assertWorkspaceNextEnvUnchanged(runner, `${label} before cleanup`);
  const termination = await terminateOwnedProcessTree(server, label, lifecycle, runTerminationCommand);
  try {
    runner.removeOwnedCopy();
  } catch (error) {
    if (termination.degradedTreeTermination) throw new Error(`${label} exact validated temporary-copy deletion failed; refusing degraded cleanup and retaining the copy.`, { cause: error });
    throw error;
  }
  lifecycle?.push('owned-copy-removed');
  if (termination.degradedTreeTermination) {
    lifecycle?.push('degraded-tree-termination');
    console.log(`${label} cleanup: degraded-tree-termination (exact owned root absent; validated temporary copy removed)`);
  }
  assertWorkspaceNextEnvUnchanged(runner, `${label} after cleanup`);
}
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

function contrastRatio(foreground, background) {
  const rgb = (value) => value.match(/[a-f\d]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
  const luminance = (value) => rgb(value).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [first, second] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (first + 0.05) / (second + 0.05);
}

function assertPackageAndSourceOrigin() {
  assert.equal(existsSync(join(workspaceConsoleRoot, 'package.json')), true, 'Console Next package must exist');
  assert.equal(existsSync(join(workspaceConsoleRoot, 'package-lock.json')), true, 'Console Next lockfile must exist');
  const pkg = JSON.parse(readFileSync(join(workspaceConsoleRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.next, '15.5.21');
  assert.equal(pkg.dependencies.react, '19.2.7');
  assert.equal(pkg.dependencies['react-dom'], '19.2.7');
  const preflight = 'python ../../tools/console_next_intake.py verify-console-next --snapshot packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf --lockfile apps/console-next/package-lock.json --console-root apps/console-next';
  assert.equal(pkg.scripts.preflight, preflight);
  for (const script of ['dev', 'build', 'start']) assert.match(pkg.scripts[script], new RegExp(`^${preflight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} && `));
  assert.match(pkg.scripts.dev, /127\.0\.0\.1/);
  assert.match(pkg.scripts.dev, /5173/);

  const closure = JSON.parse(readFileSync(closurePath, 'utf8'));
  assert.match(closure.lockfile.consoleNextLockDigest || '', /^sha256:[a-f0-9]{64}$/);
  assert.equal(closure.lockfile.status, 'captured', 'a pending closure must fail closed');
  assert.ok(closure.lockfile.packages?.length, 'the closure must retain exact locked package evidence');
  const lockedPackages = new Map(closure.lockfile.packages.map((item) => [item.name, item.version]));
  assert.equal(lockedPackages.get('postcss'), '8.5.23', 'the Console closure must use the approved PostCSS remediation.');
  assert.equal(lockedPackages.get('sharp'), '0.35.3', 'the Console closure must use the approved Sharp remediation.');
  const primitiveSources = new Map(
    closure.primitives.flatMap((primitive) => primitive.files.map((file) => [primitive.name, file.sha256])),
  );
  const localTransforms = new Map((closure.local_transformations || []).map((entry) => [entry.name, entry]));
  const uiRoot = join(workspaceConsoleRoot, 'components', 'ui');
  const uiFiles = files(uiRoot).filter((path) => path.endsWith('.tsx'));
  assert.equal(uiFiles.length, primitiveSources.size, 'only approved primitive files may be copied');
  for (const path of uiFiles) {
    const name = relative(uiRoot, path).replace(/\.tsx$/, '');
    assert.equal(primitiveSources.has(name), true, `${name} must be an approved primitive`);
    const expected = localTransforms.get(name)?.output_sha256 || primitiveSources.get(name);
    assert.equal(sha256(path), expected, `${name} must match its verified source or controlled transformation digest`);
  }
  assert.equal(existsSync(join(workspaceConsoleRoot, 'registry', 'new-york-v4', 'ui', 'button.tsx')), false, 'no unverified registry wrapper may resolve a primitive import');
  assert.deepEqual([...localTransforms.keys()], ['alert-dialog', 'dialog']);
  for (const transform of closure.local_transformations || []) {
    const path = join(uiRoot, `${transform.name}.tsx`);
    assert.equal(sha256(path), transform.output_sha256, `${transform.name} must match its recorded local transformation`);
    assert.match(readFileSync(path, 'utf8'), /@\/components\/ui\/button/);
  }
}

function assertApiContainment() {
  const api = readFileSync(join(workspaceConsoleRoot, 'lib', 'factory-api.ts'), 'utf8');
  const proxy = join(workspaceConsoleRoot, 'app', 'api', 'factory', '[...path]', 'route.ts');
  assert.match(api, /['"]\/api\/factory['"]/, 'browser requests must use the relative local proxy.');
  assert.equal(/X-Factory-Capability/.test(api), false, 'browser code must not own the capability header.');
  assert.equal(/FACTORY_API_BASE|validateFactoryApiBase/.test(api), false, 'browser code must not select an upstream API target.');
  assert.equal(existsSync(proxy), true, 'Console Next must own the server-side local proxy route.');
  const proxySource = readFileSync(proxy, 'utf8');
  assert.match(proxySource, /FACTORY_CONSOLE_API_TOKEN/, 'the server proxy must read its local token only from server environment.');
  assert.match(proxySource, /redirect:\s*['"]error['"]/, 'the server proxy must reject upstream redirects.');
  assert.match(proxySource, /127\.0\.0\.1/, 'the server proxy must enforce a loopback upstream.');
}

function assertRootPrefixPreflight() {
  const result = spawnSync('npm', ['--prefix', 'apps/console-next', 'run', 'preflight'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'root-cwd Console Next preflight failed.');
  assert.match(result.stdout, /console-next preflight: PASS/, 'root-cwd preflight must retain the fixed-digest verifier.');
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

async function unusedLoopbackPort() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const address = probe.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  if (!port) throw new Error('unable to allocate an isolated loopback port');
  return port;
}

async function waitForCondition(predicate, message) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

async function assertLineageCanvasContainsRenderedGraph(page, label) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.lineage-canvas');
    if (!canvas) return false;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return false;
    const inside = (point) => point.x >= canvasRect.left - 1 && point.x <= canvasRect.right + 1 && point.y >= canvasRect.top - 1 && point.y <= canvasRect.bottom + 1;
    const nodes = [...canvas.querySelectorAll('.react-flow__node')];
    const edges = [...canvas.querySelectorAll('.react-flow__edge-path')];
    if (nodes.length < 17 || edges.length < 16) return false;
    const nodesFit = nodes.every((node) => {
      const rect = node.getBoundingClientRect();
      return inside({ x: rect.left, y: rect.top }) && inside({ x: rect.right, y: rect.bottom });
    });
    const edgesFit = edges.every((path) => {
      const matrix = path.getScreenCTM();
      if (!matrix) return false;
      const pointAt = (length) => {
        const point = path.getPointAtLength(length);
        return { x: point.x * matrix.a + point.y * matrix.c + matrix.e, y: point.x * matrix.b + point.y * matrix.d + matrix.f };
      };
      return [pointAt(0), pointAt(path.getTotalLength())].every(inside);
    });
    return nodesFit && edgesFit;
  }, undefined, { timeout: 3000 });
  const measurement = await page.locator('.lineage-canvas').evaluate((canvas) => {
    const canvasRect = canvas.getBoundingClientRect();
    const inside = (point) => point.x >= canvasRect.left - 1 && point.x <= canvasRect.right + 1 && point.y >= canvasRect.top - 1 && point.y <= canvasRect.bottom + 1;
    const nodeFailures = [...canvas.querySelectorAll('.react-flow__node')].flatMap((node) => {
      const rect = node.getBoundingClientRect();
      return inside({ x: rect.left, y: rect.top }) && inside({ x: rect.right, y: rect.bottom }) ? [] : [{ id: node.getAttribute('data-id'), rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } }];
    });
    const edgeFailures = [...canvas.querySelectorAll('.react-flow__edge-path')].flatMap((path) => {
      const svgPath = path;
      const matrix = svgPath.getScreenCTM();
      if (!matrix) return [{ edge: svgPath.parentElement?.getAttribute('data-id') || 'unknown', reason: 'missing-screen-matrix' }];
      const pointAt = (length) => {
        const point = svgPath.getPointAtLength(length);
        return { x: point.x * matrix.a + point.y * matrix.c + matrix.e, y: point.x * matrix.b + point.y * matrix.d + matrix.f };
      };
      const endpoints = [pointAt(0), pointAt(svgPath.getTotalLength())];
      return endpoints.every(inside) ? [] : [{ edge: svgPath.parentElement?.getAttribute('data-id') || 'unknown', endpoints }];
    });
    return { nodes: canvas.querySelectorAll('.react-flow__node').length, edges: canvas.querySelectorAll('.react-flow__edge-path').length, nodeFailures, edgeFailures };
  });
  assert.ok(measurement.nodes >= 17, `${label}: every narrative and approved component node must render.`);
  assert.ok(measurement.edges >= 16, `${label}: every narrative and component relationship must render.`);
  assert.deepEqual(measurement.nodeFailures, [], `${label}: every rendered node rectangle must remain inside the Lineage canvas.`);
  assert.deepEqual(measurement.edgeFailures, [], `${label}: both transformed endpoints of every edge path must remain inside the Lineage canvas.`);
  return measurement;
}

async function runWorkflow() {
  const fixture = await startFixtureControlPlane({ failRunPollOnce: true, runCreateDelayMs: 250, stopDelayMs: 250 });
  const port = process.env.FACTORY_CONSOLE_PORT ? Number(process.env.FACTORY_CONSOLE_PORT) : await unusedLoopbackPort();
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FACTORY_CONSOLE_PORT must be a loopback TCP port.');
  const consoleUrl = `http://127.0.0.1:${port}/`;
  let runner = null;
  let server = null;
  let browser = null;
  try {
    runner = createIsolatedConsoleCopy('workflow');
    const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    assertWorkspaceNextEnvUnchanged(runner, 'workflow before spawn');
    server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: runner.copyRoot, stdio: 'ignore', env: { ...process.env, FACTORY_CONSOLE_API_BASE: fixture.base, FACTORY_CONSOLE_API_TOKEN: fixture.token, FACTORY_CONSOLE_DIST_DIR: runner.distDir } });
    const require = createRequire(import.meta.url);
    let playwright;
    try { playwright = require('playwright'); } catch { playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
    await waitForServer(consoleUrl, server);
    assertWorkspaceNextEnvUnchanged(runner, 'workflow while live');
    console.log(`console-next workflow: server ready on ${port}`);
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(consoleUrl, { waitUntil: 'domcontentloaded' });
    console.log('console-next workflow: browser ready');
    await page.locator('[data-factory-console-ready="true"]').waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedMotion = await page.locator('.workflow-canvas .factory-stage').first().evaluate((element) => getComputedStyle(element).transitionDuration);
    assert.equal(reducedMotion, '0s', 'reduced-motion users must not receive non-essential stage transitions.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `the ${width}px console viewport must not overflow horizontally.`);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'Open products' }).click();
    const productsDrawer = page.getByRole('dialog', { name: 'Products' });
    await productsDrawer.waitFor();
    const productsDrawerBox = await productsDrawer.boundingBox();
    assert.ok(productsDrawerBox && productsDrawerBox.x < 24, 'products must open from the left project rail.');
    await page.getByRole('button', { name: 'Close Products' }).click();
    await productsDrawer.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Open products' }).evaluate((element) => document.activeElement === element), true, 'closing the products drawer must restore focus to its left-rail trigger.');
    await page.getByRole('button', { name: 'Open command menu' }).click();
    const commandPalette = page.getByRole('dialog');
    await commandPalette.waitFor();
    const commandPaletteBox = await commandPalette.boundingBox();
    const commandViewport = page.viewportSize();
    assert.ok(commandPaletteBox && commandViewport && Math.abs(commandPaletteBox.x + commandPaletteBox.width / 2 - commandViewport.width / 2) < 24, 'the command menu must be centered rather than using a side drawer.');
    assert.equal(await page.getByLabel('Search commands').evaluate((element) => document.activeElement === element), true, 'the command palette must focus search on open.');
    await page.getByLabel('Search commands').fill('new');
    assert.equal(await commandPalette.getByRole('option', { name: /New product/i }).count(), 1, 'the command palette must filter local actions.');
    await page.getByRole('button', { name: 'Close Command menu' }).click();
    await page.getByRole('button', { name: 'Open command menu' }).click();
    await page.getByLabel('Search commands').fill('products');
    await page.getByRole('option', { name: 'Open products' }).click();
    const commandProductsDrawer = page.getByRole('dialog', { name: 'Products' });
    await commandProductsDrawer.waitFor();
    const commandProductsBox = await commandProductsDrawer.boundingBox();
    assert.ok(commandProductsBox && commandProductsBox.x < 24, 'Open products must always use the left project drawer, including from the command menu.');
    await page.getByRole('button', { name: 'Close Products' }).click();
    await commandPalette.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#open-command-menu-trigger').evaluate((element) => document.activeElement === element), true, 'closing Products opened from Command must restore focus to the command trigger.');
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('light')), true, 'the Console must default to the light theme.');
    const lightTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ['--fui-canvas', '--fui-paper', '--fui-ink', '--fui-teal', '--fui-line'].map((name) => style.getPropertyValue(name).trim());
    });
    assert.deepEqual(lightTokens, ['#f8fafc', '#ffffff', '#111827', '#0f766e', '#e5e7eb'], 'the light Console must resolve the declared token family.');
    assert.ok(contrastRatio(lightTokens[2], lightTokens[0]) >= 4.5 && contrastRatio(lightTokens[3], lightTokens[1]) >= 3, 'light ink and focus signal must meet the declared contrast floor.');
    const themeControl = page.getByRole('button', { name: 'Switch to dark theme' });
    assert.equal(await themeControl.count(), 1, 'the Console must preserve a named dark-theme control.');
    await themeControl.click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    const darkTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { colorScheme: style.colorScheme, values: ['--fui-canvas', '--fui-paper', '--fui-ink', '--fui-teal', '--fui-line'].map((name) => style.getPropertyValue(name).trim()) };
    });
    assert.equal(darkTokens.colorScheme, 'dark', 'dark mode must select the dark color-scheme without a fallback.');
    assert.deepEqual(darkTokens.values, ['#090d14', '#101722', '#edf4f5', '#34d3bd', '#263241'], 'dark Console must resolve the declared token family.');
    assert.ok(contrastRatio(darkTokens.values[2], darkTokens.values[0]) >= 4.5 && contrastRatio(darkTokens.values[3], darkTokens.values[1]) >= 3, 'dark ink and focus signal must meet the declared contrast floor.');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains('light'));
    assert.equal(await page.locator('[data-factory-component="icon-rail"]').count(), 1, 'the Console must use compact icon navigation.');
    assert.equal(await page.locator('.factory-inspector').count(), 0, 'evidence and decision context must not be permanently pinned in a right inspector.');
    assert.equal(await page.getByText('Local connection', { exact: true }).count(), 0, 'the product console must not expose a connection secret step.');
    const longProjectName = 'expense-approval-with-a-long-project-context-that-must-stay-identifiable';
    await page.getByLabel('Name').fill(longProjectName);
    await page.getByLabel('Describe what should happen').fill('Employees submit expenses and managers approve them.');
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.getByRole('heading', { name: 'Review the shape.' }).waitFor();
    const projectSwitcher = page.getByRole('button', { name: longProjectName });
    assert.equal(await projectSwitcher.count(), 1, 'the compact top bar must retain the full selected project name as its accessible name.');
    assert.equal(await projectSwitcher.getAttribute('title'), longProjectName, 'the compact top bar must expose the full selected project name on demand.');
    await projectSwitcher.click();
    const topbarProductsDrawer = page.getByRole('dialog', { name: 'Products' });
    await topbarProductsDrawer.waitFor();
    const topbarProductsBox = await topbarProductsDrawer.boundingBox();
    assert.ok(topbarProductsBox && topbarProductsBox.x < 24, 'the topbar project switcher must open the same left-side Products drawer.');
    const topbarProductRow = topbarProductsDrawer.getByRole('button', { name: longProjectName });
    assert.equal(await topbarProductRow.count(), 1, 'the topbar Products drawer must expose the selected product row.');
    assert.equal(await topbarProductRow.isVisible(), true, 'the topbar Products drawer must show the selected product row.');
    assert.equal(await topbarProductRow.isEnabled(), true, 'the topbar Products drawer must allow product selection.');
    await page.keyboard.press('Escape');
    await topbarProductsDrawer.waitFor({ state: 'hidden' });
    assert.equal(await projectSwitcher.evaluate((element) => document.activeElement === element), true, 'escaping the topbar Products drawer must restore focus to the topbar project switcher.');
    const railProductsTrigger = page.getByRole('button', { name: 'Open products' });
    await railProductsTrigger.click();
    const railProductsDrawer = page.getByRole('dialog', { name: 'Products' });
    await railProductsDrawer.waitFor();
    const railProductRow = railProductsDrawer.getByRole('button', { name: longProjectName });
    assert.equal(await railProductRow.count(), 1, 'the rail Products drawer must expose the selected product row.');
    assert.equal(await railProductRow.isVisible(), true, 'the rail Products drawer must show the selected product row.');
    assert.equal(await railProductRow.isEnabled(), true, 'the rail Products drawer must allow product selection.');
    await page.getByRole('button', { name: 'Close Products' }).click();
    await railProductsDrawer.waitFor({ state: 'hidden' });
    assert.equal(await railProductsTrigger.evaluate((element) => document.activeElement === element), true, 'closing the rail Products drawer must restore focus to the rail trigger.');
    const commandTrigger = page.getByRole('button', { name: 'Open command menu' });
    await commandTrigger.click();
    const commandProductsDialog = page.getByRole('dialog', { name: 'Command menu' });
    await page.getByLabel('Search commands').fill('products');
    const commandProductsOption = commandProductsDialog.getByRole('option', { name: 'Open products' });
    assert.equal(await commandProductsOption.count(), 1, 'Command must expose its Products action.');
    await commandProductsOption.click();
    const commandProductsDrawerAfterCreate = page.getByRole('dialog', { name: 'Products' });
    await commandProductsDrawerAfterCreate.waitFor();
    const commandProductRow = commandProductsDrawerAfterCreate.getByRole('button', { name: longProjectName });
    assert.equal(await commandProductRow.count(), 1, 'the Command Products drawer must expose the selected product row.');
    assert.equal(await commandProductRow.isVisible(), true, 'the Command Products drawer must show the selected product row.');
    assert.equal(await commandProductRow.isEnabled(), true, 'the Command Products drawer must allow product selection.');
    await page.getByRole('button', { name: 'Close Products' }).click();
    await commandProductsDrawerAfterCreate.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'open-command-menu-trigger');
    assert.equal(await commandTrigger.evaluate((element) => document.activeElement === element), true, 'closing the Command Products drawer must restore focus to the command trigger.');
    for (const width of [390, 560, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `the ${width}px lifecycle route must not overflow the page.`);
      if (width === 390) {
        const stageRail = page.locator('.workflow-canvas > .factory-stage-rail');
        const railMetrics = await stageRail.evaluate((element) => ({
          flexWrap: getComputedStyle(element).flexWrap,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        assert.equal(railMetrics.flexWrap, 'nowrap', 'the narrow lifecycle rail must remain a connected horizontal route, not wrap into cards.');
        assert.ok(railMetrics.scrollWidth > railMetrics.clientWidth, 'the narrow lifecycle rail must scroll inside its own bounds while preserving all stage labels.');
      }
      for (const [label, enabled] of [['Brief', true], ['Application definition', true], ['Component plan', false], ['Build run', false]]) {
        const stageButton = page.locator('.factory-stage-rail').getByRole('button', { name: new RegExp(label, 'i') });
        assert.equal(await stageButton.count(), 1, `${label} must remain discoverable at ${width}px.`);
        assert.equal(await stageButton.isVisible(), true, `${label} must remain visible at ${width}px.`);
        assert.equal(await stageButton.isDisabled(), !enabled, `${label} must preserve its valid enabled/disabled state at ${width}px.`);
        if (enabled) {
          await stageButton.focus();
          assert.equal(await stageButton.evaluate((element) => document.activeElement === element), true, `${label} must remain keyboard-focusable at ${width}px.`);
        }
      }
      await page.locator('.factory-stage-rail').getByRole('button', { name: /Brief/i }).click();
      await page.getByRole('heading', { name: 'Product outcome' }).waitFor();
      await page.locator('.factory-stage-rail').getByRole('button', { name: /Application definition/i }).click();
      await page.getByRole('heading', { name: 'Review the shape.' }).waitFor();
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('console-next workflow: definition created');
    await page.getByLabel('Role 1 label').fill('Claimant');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Record/ }).click();
    await page.getByLabel('Record ID').fill('expense_claim');
    await page.getByLabel('Primary record label').fill('Expense claim');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Fields/ }).click();
    await page.getByRole('button', { name: 'Add field' }).click();
    await page.getByLabel('Field 2 ID').fill('expense_type');
    await page.getByLabel('Field 2 label').fill('Expense type');
    await page.getByLabel('Field 2 type').selectOption('enum');
    await page.getByLabel('Field 2 options').fill('Travel, Meals');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Views/ }).click();
    await page.getByLabel('audit page label').fill('Expense audit');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Notes/ }).click();
    await page.getByLabel('Assumptions').fill('Managers are assigned.');
    await page.getByLabel('Open questions').fill('Who reconciles receipts?');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByRole('status').getByText(/Version 2 is now an immutable draft/i).waitFor();
    const savedDefinition = fixture.state.projects[0].versions.at(-1).definition;
    assert.equal(savedDefinition.roles[0].label, 'Claimant');
    assert.equal(savedDefinition.primary_record.id, 'expense_claim');
    assert.deepEqual(savedDefinition.primary_record.fields.at(-1).options, ['Travel', 'Meals']);
    assert.equal(savedDefinition.pages.find((item) => item.id === 'audit').label, 'Expense audit');
    assert.deepEqual(savedDefinition.assumptions, ['Managers are assigned.']);
    assert.deepEqual(savedDefinition.open_questions, ['Who reconciles receipts?']);
    console.log('console-next workflow: child version created');
    await page.getByRole('button', { name: 'Approve definition' }).click();
    await page.getByRole('button', { name: 'Create component plan' }).click();
    await page.getByText('Fixture planner unavailable. Retry the build plan.').waitFor();
    await page.getByRole('button', { name: 'Retry component plan' }).click();
    await page.getByRole('heading', { name: 'Inspect the assembly.' }).waitFor();
    console.log('console-next workflow: plan retried');
    const lineageComponents = [
      { key: 'ui.audit-shell', version: '1.2.3', trust_level: 'golden' },
      { key: 'ui.form-shell', version: '1.2.4', trust_level: 'golden' },
      { key: 'ui.home-page', version: '1.2.0', trust_level: 'golden' },
      { key: 'ui.login-page', version: '1.2.0', trust_level: 'golden' },
      { key: 'ui.settings-page', version: '1.2.0', trust_level: 'golden' },
      { key: 'backend.fastapi-crud', version: '0.1.0', trust_level: 'golden' },
      { key: 'backend.rbac', version: '0.1.0', trust_level: 'golden' },
      { key: 'backend.session-auth', version: '0.1.0', trust_level: 'golden' },
      { key: 'workflow.approval-gate', version: '2.0.0', trust_level: 'approved' },
      { key: 'workflow.notification', version: '2.0.0', trust_level: 'approved' },
      { key: 'data.audit-ledger', version: '3.1.0', trust_level: 'approved' },
      { key: 'data.postgres', version: '3.1.0', trust_level: 'approved' },
      { key: 'ops.audit-log', version: '1.0.1', trust_level: 'golden' },
      { key: 'ops.preview-worker', version: '1.0.1', trust_level: 'golden' },
    ];
    fixture.state.projects[0].plans.at(-1).components = lineageComponents;
    await page.getByRole('button', { name: 'Open products' }).click();
    const lineageProducts = page.getByRole('dialog', { name: 'Products' });
    await lineageProducts.getByRole('button', { name: 'Version 2' }).click();
    await lineageProducts.waitFor({ state: 'hidden' });
    await page.locator('[data-component-key="backend.fastapi-crud"]').waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Open product lineage' }).click();
    await page.locator('[data-factory-component="lineage-dag"]').waitFor();
    const lineageWindow = page.getByRole('dialog');
    const lineageWindowBox = await lineageWindow.boundingBox();
    const viewport = page.viewportSize();
    assert.ok(lineageWindowBox && viewport && lineageWindowBox.x > viewport.width / 4 && lineageWindowBox.y > 80, 'lineage must open as a floating work window, not a right drawer.');
    assert.ok(lineageWindowBox && viewport && lineageWindowBox.height <= viewport.height / 2 && Math.abs(lineageWindowBox.x + lineageWindowBox.width - (viewport.width - 28)) < 4 && Math.abs(lineageWindowBox.y + lineageWindowBox.height - (viewport.height - 24)) < 4, 'compact Lineage must be a bounded bottom-right work window rather than a tall side sheet.');
    assert.equal(await page.locator('.factory-sheet-overlay.is-clear').count(), 1, 'the floating lineage inspector must keep a clear modal overlay to contain keyboard focus.');
    const componentNodes = await Promise.all(lineageComponents.map(async (component) => {
      const button = lineageWindow.getByRole('button', { name: `component: ${component.key}` });
      await button.waitFor();
      return { key: component.key, box: await button.boundingBox() };
    }));
    const planNodeBox = await lineageWindow.getByRole('button', { name: 'plan: Component plan' }).boundingBox();
    assert.ok(planNodeBox && componentNodes.every((item) => item.box && item.box.y > planNodeBox.y), 'every approved component must render below the narrative plan node.');
    assert.equal(componentNodes.length, 14, 'the fixture must prove containment using fourteen approved packages.');
    assert.deepEqual(componentNodes.slice().sort((left, right) => left.box.y - right.box.y || left.box.x - right.box.x).map((item) => item.key), ['ui.audit-shell', 'ui.form-shell', 'ui.home-page', 'ui.login-page', 'ui.settings-page', 'backend.fastapi-crud', 'backend.rbac', 'backend.session-auth', 'workflow.approval-gate', 'workflow.notification', 'data.audit-ledger', 'data.postgres', 'ops.audit-log', 'ops.preview-worker'], 'component nodes must use the deterministic domain then lexical order.');
    const desktopMeasurement = await assertLineageCanvasContainsRenderedGraph(page, '1440x900 initial Lineage');
    console.log(`console-next workflow: 1440x900 Lineage contains ${desktopMeasurement.nodes} nodes and ${desktopMeasurement.edges} edges`);
    const initialLineageCoordinates = componentNodes.map(({ key, box }) => ({ key, x: box?.x, y: box?.y }));
    const selectedComponent = lineageWindow.getByRole('button', { name: 'component: ui.audit-shell' });
    await selectedComponent.click();
    const lineageSelection = lineageWindow.locator('[data-factory-component="lineage-selection"]');
    await lineageSelection.waitFor();
    assert.equal(await selectedComponent.getAttribute('aria-pressed'), 'true', 'selecting a component must expose its pressed state.');
    const lineageSelectionText = await lineageSelection.textContent() || '';
    for (const safeDetail of ['component', 'ui.audit-shell', '1.2.3', 'golden']) assert.ok(lineageSelectionText.includes(safeDetail), 'the compact inspector must expose only the selected component kind, key, version, and trust status.');
    assert.equal(await lineageSelection.getByText('Who reconciles receipts?', { exact: true }).count(), 0, 'the Lineage inspector must not render raw brief content.');
    assert.equal(await lineageSelection.getByText('component-lock.json', { exact: true }).count(), 0, 'the Lineage inspector must not render artifact bodies or evidence names.');
    await lineageWindow.getByRole('button', { name: 'Maximize lineage' }).click();
    const expandedLineageBox = await page.locator('.lineage-dag.is-expanded').boundingBox();
    assert.ok(expandedLineageBox && viewport && expandedLineageBox.width > viewport.width * 0.8, 'lineage must expand into an inspectable full canvas.');
    assert.ok((await lineageWindow.locator('[data-factory-component="lineage-selection"]').textContent() || '').includes('ui.audit-shell1.2.3'), 'selection must survive maximizing Lineage.');
    await assertLineageCanvasContainsRenderedGraph(page, '1440x900 maximized Lineage');
    await page.getByRole('button', { name: 'Restore lineage' }).click();
    assert.equal(await lineageWindow.locator('.react-flow__minimap').count(), 0, 'the compact floating lineage window must not waste space on a minimap.');
    assert.ok((await lineageWindow.locator('[data-factory-component="lineage-selection"]').textContent() || '').includes('ui.audit-shell1.2.3'), 'selection must survive restoring compact Lineage.');
    await assertLineageCanvasContainsRenderedGraph(page, '1440x900 restored Lineage');
    const planNode = lineageWindow.getByRole('button', { name: 'plan: Component plan' });
    await planNode.focus();
    await planNode.press('Enter');
    assert.equal(await planNode.evaluate((element) => document.activeElement === element), true, 'lineage nodes must remain keyboard-focusable.');
    await page.getByRole('button', { name: 'Close Product lineage' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'open-lineage-trigger');
    assert.equal(await page.getByRole('button', { name: 'Open product lineage' }).evaluate((element) => document.activeElement === element), true, 'closing the floating lineage window must restore focus to its trigger.');
    await page.getByRole('button', { name: 'Open product lineage' }).click();
    await page.locator('[data-factory-component="lineage-dag"]').waitFor();
    const reopenedLineage = page.getByRole('dialog');
    const reopenedLineageCoordinates = await Promise.all(lineageComponents.map(async ({ key }) => {
      const box = await reopenedLineage.getByRole('button', { name: `component: ${key}` }).boundingBox();
      return { key, x: box?.x, y: box?.y };
    }));
    assert.deepEqual(reopenedLineageCoordinates, initialLineageCoordinates, 'a full close/reopen hydration cycle must restore byte-for-byte-equivalent deterministic component coordinates.');
    await assertLineageCanvasContainsRenderedGraph(page, '1440x900 reopened Lineage');
    for (let cycle = 1; cycle <= 4; cycle += 1) {
      await reopenedLineage.getByRole('button', { name: 'Maximize lineage' }).click();
      await assertLineageCanvasContainsRenderedGraph(page, `1440x900 repeated maximize ${cycle}`);
      await reopenedLineage.getByRole('button', { name: 'Restore lineage' }).click();
      await assertLineageCanvasContainsRenderedGraph(page, `1440x900 repeated restore ${cycle}`);
      await reopenedLineage.getByRole('button', { name: 'Close Product lineage' }).click();
      await reopenedLineage.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Open product lineage' }).click();
      await page.locator('[data-factory-component="lineage-dag"]').waitFor();
      await assertLineageCanvasContainsRenderedGraph(page, `1440x900 repeated reopen ${cycle}`);
    }
    await page.getByRole('button', { name: 'Close Product lineage' }).click();
    await reopenedLineage.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'open-lineage-trigger');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: 'Open product lineage' }).click();
    const shortDesktopLineage = page.getByRole('dialog');
    const shortDesktopLineageBox = await shortDesktopLineage.boundingBox();
    const shortDesktopViewport = page.viewportSize();
    assert.ok(shortDesktopLineageBox && shortDesktopViewport && shortDesktopLineageBox.height <= shortDesktopViewport.height / 2 && Math.abs(shortDesktopLineageBox.x + shortDesktopLineageBox.width - (shortDesktopViewport.width - 28)) < 4 && Math.abs(shortDesktopLineageBox.y + shortDesktopLineageBox.height - (shortDesktopViewport.height - 24)) < 4, 'compact Lineage must remain below half-height while bottom-right anchored at 1280x720.');
    const resizedMeasurement = await assertLineageCanvasContainsRenderedGraph(page, '1280x720 resized Lineage');
    console.log(`console-next workflow: 1280x720 Lineage contains ${resizedMeasurement.nodes} nodes and ${resizedMeasurement.edges} edges`);
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await shortDesktopLineage.getByRole('button', { name: 'Maximize lineage' }).click();
      await assertLineageCanvasContainsRenderedGraph(page, `1280x720 repeated maximize ${cycle}`);
      await shortDesktopLineage.getByRole('button', { name: 'Restore lineage' }).click();
      await assertLineageCanvasContainsRenderedGraph(page, `1280x720 repeated restore ${cycle}`);
      await shortDesktopLineage.getByRole('button', { name: 'Close Product lineage' }).click();
      await shortDesktopLineage.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Open product lineage' }).click();
      await page.locator('[data-factory-component="lineage-dag"]').waitFor();
      await assertLineageCanvasContainsRenderedGraph(page, `1280x720 repeated reopen ${cycle}`);
    }
    await page.getByRole('button', { name: 'Close Product lineage' }).click();
    await shortDesktopLineage.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'open-lineage-trigger');
    for (const width of [390, 560]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: 'Open product lineage' }).click();
      const narrowLineage = page.getByRole('dialog');
      const narrowLineageBox = await narrowLineage.boundingBox();
      assert.ok(narrowLineageBox && narrowLineageBox.x >= 0 && narrowLineageBox.x + narrowLineageBox.width <= width, `the floating lineage window must remain fully inside a ${width}px viewport.`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `opening Lineage at ${width}px must not cause document overflow.`);
      assert.equal(await narrowLineage.getByRole('button', { name: 'Close Product lineage' }).isVisible(), true, `Lineage Close must remain reachable at ${width}px.`);
      assert.ok(await narrowLineage.locator('.react-flow__controls-button').count() > 0, `Lineage graph navigation must remain usable at ${width}px.`);
      await page.getByRole('button', { name: 'Close Product lineage' }).click();
      await narrowLineage.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.id === 'open-lineage-trigger');
    }
    for (const width of [768, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: 'Open product lineage' }).click();
      const intermediateLineage = page.getByRole('dialog');
      const intermediateLineageBox = await intermediateLineage.boundingBox();
      assert.ok(intermediateLineageBox && intermediateLineageBox.x >= 24 && intermediateLineageBox.x + intermediateLineageBox.width <= width - 24, `Lineage must use symmetric safe insets at ${width}px.`);
      assert.ok(intermediateLineageBox && intermediateLineageBox.height < 844 - 96, `Lineage must retain a bounded work-window height at ${width}px.`);
      assert.equal(await intermediateLineage.getByRole('button', { name: 'Close Product lineage' }).isVisible(), true, `Lineage Close must remain reachable at ${width}px.`);
      assert.ok(await intermediateLineage.locator('.react-flow__controls-button').count() > 0, `Lineage graph navigation must remain usable at ${width}px.`);
      await page.getByRole('button', { name: 'Close Product lineage' }).click();
      await intermediateLineage.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.id === 'open-lineage-trigger');
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    const approvePlan = page.getByRole('button', { name: 'Approve component plan' });
    await approvePlan.waitFor({ state: 'visible' });
    assert.equal(await approvePlan.isDisabled(), false, 'a draft component plan must be approvable after its lineage is inspected.');
    await approvePlan.click();
    const queueBuild = page.getByRole('button', { name: 'Queue build' });
    const queuedRunResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/plans\/[^/]+\/runs$/.test(new URL(response.url()).pathname));
    await queueBuild.click();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Queueing build', { exact: true }).waitFor();
    await queuedRunResponse;
    assert.equal(fixture.state.runCreateRequests, 1, 'two immediate Queue build activations must produce only one run request.');
    assert.equal(await queueBuild.isDisabled(), true, 'Queue build must be natively disabled while the run mutation is active.');
    await page.getByRole('button', { name: 'Retry run status' }).waitFor({ timeout: 8000 });
    assert.equal(fixture.state.runCreateRequests, 1, 'a run-poll failure must not start another run.');
    assert.equal(fixture.state.stopRequests, 0, 'a run-poll failure must not request teardown.');
    await page.getByRole('button', { name: 'Retry run status' }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Stop preview' && !button.disabled), undefined, { timeout: 8000 });
    console.log('console-next workflow: preview ready');
    assert.equal(await page.locator('.build-evidence-peek').count(), 0, 'evidence detail must stay closed until its explicit trigger is used.');
    assert.equal(await page.getByText('Run diagnostics', { exact: true }).count(), 0, 'diagnostics must not be rendered in the build workspace by default.');
    assert.equal(await page.locator('.workflow-canvas > .factory-stage-rail').evaluate((element) => getComputedStyle(element).display), 'flex', 'lifecycle navigation must be a connected route rather than a card grid.');
    await page.locator('#build-evidence-trigger').click();
    await page.getByRole('dialog').waitFor();
    const evidenceWindow = page.getByRole('dialog');
    const evidenceWindowBox = await evidenceWindow.boundingBox();
    const evidenceViewport = page.viewportSize();
    assert.ok(evidenceWindowBox && evidenceViewport && evidenceWindowBox.x + evidenceWindowBox.width > evidenceViewport.width - 24 && evidenceWindowBox.x > evidenceViewport.width / 2, 'build evidence must open as a right-side context sheet, not a centered or left-side dialog.');
    assert.equal(await evidenceWindow.getByText('component-lock.json', { exact: true }).count(), 1, 'build evidence must expose the artifact filename instead of an icon-only action.');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download component-lock.json' }).click();
    assert.equal((await downloadPromise).suggestedFilename(), 'component-lock.json');
    assert.equal(fixture.state.artifactToken, fixture.token, 'artifact download must retain the server-side capability header');
    await page.getByRole('button', { name: 'Close Build evidence' }).click();
    const preview = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Open preview' }).click();
    await (await preview).close();
    await page.getByRole('button', { name: 'Stop preview' }).click();
    const stopDialog = page.getByRole('dialog');
    const stopDialogBox = await stopDialog.boundingBox();
    const stopViewport = page.viewportSize();
    assert.ok(stopDialogBox && stopViewport && Math.abs(stopDialogBox.x + stopDialogBox.width / 2 - stopViewport.width / 2) < 24, 'the destructive stop confirmation must be centered.');
    await page.waitForFunction(() => document.activeElement?.id === 'cancel-stop-preview');
    const confirmStop = page.getByRole('button', { name: 'Confirm stop' });
    const stoppedResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/runs\/[^/]+\/stop$/.test(new URL(response.url()).pathname));
    await confirmStop.click();
    await page.getByRole('status').getByText('Requesting stop', { exact: true }).waitFor();
    assert.equal(await confirmStop.isDisabled(), true, 'Confirm stop must be natively disabled while its immutable request is in flight.');
    await page.keyboard.press('Enter');
    await stoppedResponse;
    assert.equal(fixture.state.stopRequests, 1, 'pointer plus keyboard confirmation must produce only one stop request.');
    await page.getByRole('button', { name: 'Queue another build' }).waitFor({ timeout: 8000 });
    assert.equal(fixture.state.planAttempts, 2, 'the retry control must create a second plan request');
  } finally {
    try { if (browser) await browser.close(); } finally {
      try { if (runner) await cleanupOwnedConsoleHarness(server, runner, 'workflow'); } finally { await fixture.close(); }
    }
  }
}

async function runHydrationRecoveryEvidence() {
  const fixture = await startFixtureControlPlane({
    initialProjects: [{ name: 'hydrated-project' }],
    failInitialProjectsOnce: true,
    delayInitialProjectsMs: 180,
    delayProjectLoadMs: 240,
  });
  const port = await unusedLoopbackPort();
  let runner = null;
  let server = null;
  let browser = null;
  try {
    runner = createIsolatedConsoleCopy('hydration');
    const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    assertWorkspaceNextEnvUnchanged(runner, 'hydration before spawn');
    server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: runner.copyRoot, stdio: 'ignore', env: { ...process.env, FACTORY_CONSOLE_API_BASE: fixture.base, FACTORY_CONSOLE_API_TOKEN: fixture.token, FACTORY_CONSOLE_DIST_DIR: runner.distDir } });
    const require = createRequire(import.meta.url);
    let playwright;
    try { playwright = require('playwright'); } catch { playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await waitForServer(`http://127.0.0.1:${port}/`, server);
    assertWorkspaceNextEnvUnchanged(runner, 'hydration while live');
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-factory-console-ready="true"]').waitFor();
    await page.getByRole('button', { name: 'Retry initial load' }).waitFor({ timeout: 8000 });
    await page.getByLabel('Name').fill('local-draft');
    const localBrief = 'Keep this local Brief while the delayed project index returns.';
    await page.getByLabel('Describe what should happen').fill(localBrief);
    await page.getByRole('button', { name: 'Retry initial load' }).click();
    await page.waitForFunction(() => document.querySelectorAll('button').length > 0 && ![...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Retry initial load'));
    assert.equal(fixture.state.initialProjectsRequests, 2, 'Retry initial load must issue exactly one explicit second summary GET.');
    assert.equal(await page.getByLabel('Name').inputValue(), 'local-draft', 'late hydration must not overwrite a local project name.');
    assert.equal(await page.getByLabel('Describe what should happen').inputValue(), localBrief, 'late hydration must not overwrite a local Brief.');
    assert.equal(await page.locator('.console-project-switcher').getAttribute('title'), 'New product', 'a protected local Brief must not be replaced by the hydrated project selection.');
  } finally {
    try { if (browser) await browser.close(); } finally { try { if (runner) await cleanupOwnedConsoleHarness(server, runner, 'hydration'); } finally { await fixture.close(); } }
  }
}

async function runDetailHydrationRaceEvidence() {
  const fixture = await startFixtureControlPlane({ initialProjects: [{ name: 'hydrated-project' }], delayProjectLoadMs: 260 });
  const port = await unusedLoopbackPort();
  let runner = null;
  let server = null;
  let browser = null;
  try {
    runner = createIsolatedConsoleCopy('detail-race');
    const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    assertWorkspaceNextEnvUnchanged(runner, 'detail-race before spawn');
    server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: runner.copyRoot, stdio: 'ignore', env: { ...process.env, FACTORY_CONSOLE_API_BASE: fixture.base, FACTORY_CONSOLE_API_TOKEN: fixture.token, FACTORY_CONSOLE_DIST_DIR: runner.distDir } });
    const require = createRequire(import.meta.url);
    let playwright;
    try { playwright = require('playwright'); } catch { playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await waitForServer(`http://127.0.0.1:${port}/`, server);
    assertWorkspaceNextEnvUnchanged(runner, 'detail-race while live');
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-factory-console-ready="true"]').waitFor();
    await waitForCondition(() => fixture.state.projectLoadRequests === 1, 'the immediate project summary must begin exactly one delayed project-detail request.');
    await page.getByLabel('Name').fill('detail-race-draft');
    const localBrief = 'Keep this local Brief while the delayed selected-project detail response returns.';
    await page.getByLabel('Describe what should happen').fill(localBrief);
    await page.waitForTimeout(340);
    assert.equal(fixture.state.projectLoadRequests, 1, 'the detail-race fixture must issue exactly one selected-project GET.');
    assert.equal(await page.getByLabel('Name').inputValue(), 'detail-race-draft', 'a delayed project-detail response must not overwrite a local project name.');
    assert.equal(await page.getByLabel('Describe what should happen').inputValue(), localBrief, 'a delayed project-detail response must not overwrite a local Brief.');
    assert.equal(await page.locator('.console-project-switcher').getAttribute('title'), 'New product', 'a protected local Brief must block selected-project detail adoption.');
  } finally {
    try { if (browser) await browser.close(); } finally { try { if (runner) await cleanupOwnedConsoleHarness(server, runner, 'detail-race'); } finally { await fixture.close(); } }
  }
}

async function runWorkflowPreReadinessCleanupRegression() {
  const runner = createIsolatedConsoleCopy('pre-readiness');
  const output = join(runner.copyRoot, runner.distDir);
  const port = await unusedLoopbackPort();
  const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const lifecycle = [];
  let ownedPid = null;
  async function runForcedEarlyExit() {
    assertWorkspaceNextEnvUnchanged(runner, 'pre-readiness before spawn');
    const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: runner.copyRoot, stdio: 'ignore', env: { ...process.env, FACTORY_CONSOLE_DIST_DIR: runner.distDir } });
    ownedPid = server.pid;
    assert.equal(Number.isInteger(ownedPid) && ownedPid > 0, true, 'the pre-readiness regression must retain the exact PID returned by its own spawn.');
    try {
      await waitForCondition(
        () => existsSync(output),
        'the real pre-readiness runner must create output inside its copied root before forced termination.',
      );
      assertWorkspaceNextEnvUnchanged(runner, 'pre-readiness while live');
      throw new Error('forced pre-readiness runner abort');
    } finally {
      await cleanupOwnedConsoleHarness(server, runner, 'pre-readiness workflow', lifecycle);
    }
  }
  await assert.rejects(runForcedEarlyExit(), /forced pre-readiness runner abort/, 'the actual runner must abort after mutation and delegate termination to cleanup.');
  assert.deepEqual(lifecycle, ['owned-root-present', process.platform === 'win32' ? 'tree-termination-succeeded' : 'tree-termination-requested', 'owned-root-absent', 'owned-copy-removed'], 'copy removal must follow successful termination and verified absence of the exact owned process tree.');
  assert.throws(() => process.kill(ownedPid, 0), { code: 'ESRCH' }, 'cleanup must verify that its exact owned PID no longer exists.');
  assert.equal(existsSync(runner.copyRoot), false, 'pre-readiness cleanup must remove its copied root only after PID absence is verified.');
  assertWorkspaceNextEnvUnchanged(runner, 'pre-readiness after early-exit cleanup');
}

async function runNonzeroTaskkillCleanupRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('taskkill-failure');
  const output = join(runner.copyRoot, runner.distDir);
  const port = await unusedLoopbackPort();
  const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const lifecycle = [];
  const recoveryLifecycle = [];
  const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: runner.copyRoot,
    stdio: 'ignore',
    env: { ...process.env, FACTORY_CONSOLE_DIST_DIR: runner.distDir },
  });
  const ownedPid = server.pid;
  try {
    await waitForServer(`http://127.0.0.1:${port}/`, server);
    assert.equal(existsSync(output), true, 'the controlled taskkill failure must start Next and create output only inside its copied root.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled taskkill failure while live');
    await assert.rejects(
      cleanupOwnedConsoleHarness(
        server,
        runner,
        'controlled nonzero taskkill workflow',
        lifecycle,
        (command, args, options) => {
          assert.equal(command, 'taskkill', 'controlled failure must intercept only the harness taskkill invocation.');
          assert.deepEqual(args, ['/PID', String(ownedPid), '/T', '/F'], 'controlled failure must retain the exact test-owned root PID target.');
          assert.deepEqual(options, { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }, 'controlled failure must retain the non-interactive taskkill options.');
          return { error: undefined, status: 1 };
        },
      ),
      /taskkill exited with status 1 \(no stderr\); refusing cleanup/,
      'a nonzero taskkill result must fail closed even after the short-lived owned PID exits naturally.',
    );
    assert.deepEqual(lifecycle, ['owned-root-present'], 'a nonzero taskkill result must fail before successful termination or cleanup is reported.');
    assert.equal(existsSync(runner.copyRoot), true, 'a nonzero taskkill result must retain the copied runner for inspection.');
    assert.equal(existsSync(output), true, 'a nonzero taskkill result must retain copied output for inspection.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled taskkill failure after fail-closed cleanup');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled nonzero taskkill workflow recovery')) {
      await terminateOwnedProcessTree(server, 'controlled nonzero taskkill workflow recovery', recoveryLifecycle);
    }
    assert.equal(ownedRootExists(ownedPid, 'controlled nonzero taskkill workflow recovered root'), false, 'controlled recovery must independently verify the exact copied-runner PID is absent.');
    runner.removeOwnedCopy();
    assertWorkspaceNextEnvUnchanged(runner, 'controlled taskkill failure after recovery');
  }
}

async function runDegradedTaskkillCleanupRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('degraded-taskkill');
  const lifecycle = [];
  const server = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    cwd: runner.copyRoot,
    stdio: 'ignore',
    windowsHide: true,
  });
  const ownedPid = server.pid;
  try {
    await cleanupOwnedConsoleHarness(
      server,
      runner,
      'controlled degraded-tree workflow',
      lifecycle,
      (command, args, options) => {
        const actualTermination = spawnSync(command, args, options);
        assert.equal(actualTermination.status, 0, 'the degraded-tree regression must really terminate only its exact owned dummy root.');
        return { error: undefined, status: 1, stderr: '' };
      },
    );
    assert.deepEqual(lifecycle, ['owned-root-present', 'owned-root-absent', 'owned-copy-removed', 'degraded-tree-termination'], 'a nonzero taskkill may report degraded success only after exact root absence and validated copy deletion.');
    assert.equal(ownedRootExists(ownedPid, 'controlled degraded-tree workflow completed root'), false, 'degraded cleanup must verify the exact owned root PID is absent.');
    assert.equal(existsSync(runner.copyRoot), false, 'degraded cleanup must delete the exact validated temporary copy.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled degraded-tree workflow after cleanup');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled degraded-tree workflow recovery')) spawnSync('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (existsSync(runner.copyRoot)) runner.removeOwnedCopy();
  }
}

async function runDegradedCopyDeletionFailureRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('degraded-delete-failure');
  const lifecycle = [];
  const server = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: runner.copyRoot, stdio: 'ignore', windowsHide: true });
  const ownedPid = server.pid;
  const deletionFailureRunner = {
    ...runner,
    removeOwnedCopy() {
      throw new Error('controlled validated copy deletion failure');
    },
  };
  try {
    await assert.rejects(
      cleanupOwnedConsoleHarness(
        server,
        deletionFailureRunner,
        'controlled degraded deletion failure workflow',
        lifecycle,
        (command, args, options) => {
          const actualTermination = spawnSync(command, args, options);
          assert.equal(actualTermination.status, 0, 'the degraded deletion-failure regression must terminate only its exact owned dummy root.');
          return { error: undefined, status: 1, stderr: '' };
        },
      ),
      /exact validated temporary-copy deletion failed/,
      'degraded cleanup must fail closed when exact validated copy deletion fails.',
    );
    assert.deepEqual(lifecycle, ['owned-root-present', 'owned-root-absent'], 'failed degraded deletion must not record copy removal or degraded success.');
    assert.equal(existsSync(runner.copyRoot), true, 'failed degraded deletion must retain the exact temporary copy.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled degraded deletion failure workflow');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled degraded deletion failure workflow recovery')) spawnSync('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (existsSync(runner.copyRoot)) runner.removeOwnedCopy();
  }
}

if (process.argv.includes('--assert-package-only')) {
  assertPackageAndSourceOrigin();
  assertApiContainment();
  assertRootPrefixPreflight();
  console.log('console-next package/source origin: PASS');
} else if (process.argv.includes('--hydration-only')) {
  assertPackageAndSourceOrigin();
  assertApiContainment();
  await runHydrationRecoveryEvidence();
  console.log('console-next hydration recovery: PASS');
} else if (process.argv.includes('--detail-hydration-only')) {
  assertPackageAndSourceOrigin();
  assertApiContainment();
  await runDetailHydrationRaceEvidence();
  console.log('console-next detail hydration race: PASS');
} else if (process.argv.includes('--pre-readiness-cleanup-only')) {
  await runWorkflowPreReadinessCleanupRegression();
  await runNonzeroTaskkillCleanupRegression();
  await runDegradedTaskkillCleanupRegression();
  await runDegradedCopyDeletionFailureRegression();
  console.log('console-next pre-readiness cleanup: PASS');
} else {
  assertPackageAndSourceOrigin();
  assertApiContainment();
  await runWorkflow();
  console.log('console-next workflow: PASS');
}
