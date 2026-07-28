import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
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
    const termination = runTerminationCommand('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (termination.error) throw new Error(`${label} owned process-tree termination could not be invoked; refusing cleanup.`, { cause: termination.error });
    if (termination.status === 0) lifecycle?.push('tree-termination-succeeded');
    else nonzeroTaskkillStatus = { status: termination.status };
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
  if (nonzeroTaskkillStatus) throw new Error(`${label} taskkill exited with status ${String(nonzeroTaskkillStatus.status)}; refusing cleanup because the exact owned root PID remains.`);
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

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}

function assertRuntimeContainment() {
  const files = sourceFiles(join(workspaceConsoleRoot, 'app'))
    .concat(sourceFiles(join(workspaceConsoleRoot, 'components')))
    .concat(sourceFiles(join(workspaceConsoleRoot, 'lib')))
    .concat([join(workspaceConsoleRoot, 'next.config.mjs')]);
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

  const apiPath = join(workspaceConsoleRoot, 'lib', 'factory-api.ts');
  const api = readFileSync(apiPath, 'utf8');
  const proxyPath = join(workspaceConsoleRoot, 'app', 'api', 'factory', '[...path]', 'route.ts');
  assert.equal((api.match(/\bfetch\s*\(/g) || []).length, 2, 'only FactoryApi may make browser fetch calls.');
  assert.equal(/X-Factory-Capability|FACTORY_API_BASE/.test(api), false, 'browser code must not hold a Factory credential or upstream URL.');
  for (const path of files.filter((path) => path !== apiPath && path !== proxyPath)) {
    assert.equal(/\bfetch\s*\(/.test(readFileSync(path, 'utf8')), false, `${path} must not make network calls outside FactoryApi.`);
  }
  const proxy = readFileSync(proxyPath, 'utf8');
  assert.match(api, /['"]\/api\/factory['"]/, 'FactoryApi must use only the relative local proxy.');
  assert.match(proxy, /FACTORY_CONSOLE_API_TOKEN/, 'the server proxy must read the capability from environment.');
  assert.match(proxy, /parsed\.hostname !== '127\.0\.0\.1'/, 'the server proxy must enforce the loopback host.');
  assert.match(proxy, /redirect:\s*'error'/, 'the server proxy must reject upstream redirects.');
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`Console Next stopped before startup (exit ${child.exitCode}).`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The local development server has not started yet.
    }
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

async function expectFocused(page, locator, message) {
  await locator.focus();
  assert.equal(await locator.evaluate((element) => document.activeElement === element), true, message);
}

async function expectKeyboardVisibleFocus(page, locator, message) {
  await expectFocused(page, locator, message);
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { offset: style.outlineOffset, style: style.outlineStyle, width: style.outlineWidth };
  });
  assert.deepEqual(focus, { offset: '2px', style: 'solid', width: '3px' }, `${message} It must have the shared keyboard-visible focus treatment.`);
}

async function resetFocusTrace(page) {
  await page.evaluate(() => {
    const target = window;
    target.__factoryFocusTrace = [];
    if (target.__factoryFocusTraceInstalled) return;
    document.addEventListener('focusin', (event) => {
      const element = event.target;
      target.__factoryFocusTrace.push(element instanceof HTMLElement ? element.innerText.trim() || element.getAttribute('aria-label') || element.id || element.tagName : String(element));
    });
    target.__factoryFocusTraceInstalled = true;
  });
}

async function focusTrace(page) {
  return page.evaluate(() => window.__factoryFocusTrace.slice());
}

async function waitForFocusRestore(page, label) {
  await page.waitForFunction((expectedLabel) => {
    const active = document.activeElement;
    return active instanceof HTMLElement && (active.innerText.trim() === expectedLabel || active.getAttribute('aria-label') === expectedLabel);
  }, label);
}

async function waitForFocusRestoreById(page, id) {
  await page.waitForFunction((expectedId) => document.activeElement?.id === expectedId, id);
}

async function runAccessibilityEvidence() {
  assert.equal(existsSync(join(workspaceConsoleRoot, 'package-lock.json')), true, 'the checked-in Console Next lockfile is required.');
  assertRuntimeContainment();

  const fixture = await startFixtureControlPlane({ runCreateDelayMs: 250, artifactDelayMs: 250 });
  const port = process.env.FACTORY_CONSOLE_PORT ? Number(process.env.FACTORY_CONSOLE_PORT) : await unusedLoopbackPort();
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FACTORY_CONSOLE_PORT must be a loopback TCP port.');
  const consoleUrl = `http://127.0.0.1:${port}/`;
  let runner = null;
  let server = null;
  let browser = null;
  try {
    runner = createIsolatedConsoleCopy('accessibility');
    const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    assertWorkspaceNextEnvUnchanged(runner, 'accessibility before spawn');
    server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: runner.copyRoot, stdio: 'ignore', env: { ...process.env, FACTORY_CONSOLE_API_BASE: fixture.base, FACTORY_CONSOLE_API_TOKEN: fixture.token, FACTORY_CONSOLE_DIST_DIR: runner.distDir } });
    const require = createRequire(import.meta.url);
    let playwright;
    try { playwright = require('playwright'); } catch { playwright = require(process.env.FACTORY_PLAYWRIGHT_PATH || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
    await waitForServer(consoleUrl, server);
    assertWorkspaceNextEnvUnchanged(runner, 'accessibility while live');
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(consoleUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-factory-console-ready="true"]').waitFor();
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('light')), true, 'the Console must default to light after hydration.');
    await expectFocused(page, page.getByRole('button', { name: 'Switch to dark theme' }), 'the theme control must be keyboard focusable.');
    await expectFocused(page, page.getByRole('button', { name: 'Open products' }), 'the compact product navigation must be keyboard focusable.');
    assert.equal(await page.locator('.factory-inspector').count(), 0, 'a permanent evidence inspector must not remain in the layout.');
    assert.equal(await page.getByText('Local connection', { exact: true }).count(), 0, 'the product console must not expose a connection-secret step.');
    assert.equal(await page.getByLabel('Local session capability').count(), 0, 'a browser must not receive a capability field.');
    await expectFocused(page, page.getByRole('complementary', { name: 'Console navigation' }).getByLabel('New product'), 'the project-creation control must be keyboard focusable.');
    await assertAllFormControlsAreLabelled(page);

    await page.getByRole('button', { name: 'Open command menu' }).click();
    const commandSearch = page.getByRole('combobox', { name: 'Search commands' });
    assert.equal(await commandSearch.getAttribute('aria-controls'), 'command-menu-options', 'command search must own its matching command listbox.');
    assert.equal(await commandSearch.getAttribute('aria-activedescendant'), 'command-option-open-products', 'command search must expose its initial active command.');
    await commandSearch.press('ArrowDown');
    assert.equal(await commandSearch.getAttribute('aria-activedescendant'), 'command-option-new-product', 'ArrowDown must update the combobox active descendant.');
    const activeCommand = page.locator('#command-option-new-product');
    assert.equal(await activeCommand.getAttribute('role'), 'option', 'the active descendant must identify a listbox option.');
    assert.equal(await activeCommand.getAttribute('aria-selected'), 'true', 'the active descendant must match the selected command option.');
    await commandSearch.fill('no matching command');
    assert.equal(await commandSearch.getAttribute('aria-expanded'), 'true', 'the visible zero-results command popup must remain expanded.');
    assert.equal(await commandSearch.getAttribute('aria-activedescendant'), null, 'zero results must not expose a stale active command option.');
    assert.equal(await page.locator('#command-menu-options').isVisible(), true, 'the command listbox must remain visible for a zero-results message.');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Command menu' }).waitFor({ state: 'hidden' });

    await page.getByLabel('Name').fill('accessibility-expense-approval');
    await page.getByLabel('Describe what should happen').fill('Employees submit expenses and managers approve them.');
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.getByRole('heading', { name: 'Review the shape.' }).waitFor();
    const status = page.getByRole('status');
    await status.waitFor();
    assert.equal(await status.getAttribute('aria-live'), 'polite', 'progress notices must be announced politely.');
    assert.match(await status.textContent() || '', /application definition is ready for review/i);
    for (const label of ['Role 1 ID', 'Role 1 label', 'Role 1 responsibility']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its dynamic structured-definition control.`);
    }
    await expectKeyboardVisibleFocus(page, page.getByLabel('Role 1 label'), 'the dynamic role editor input must be keyboard focusable.');
    await expectKeyboardVisibleFocus(page, page.getByLabel('Role 1 responsibility'), 'the dynamic role editor select must be keyboard focusable.');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Fields/ }).click();
    for (const label of ['Field 1 ID', 'Field 1 label', 'Field 1 type']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its dynamic structured-definition control.`);
    }
    await expectKeyboardVisibleFocus(page, page.getByLabel('Field 1 type'), 'the dynamic field editor select must be keyboard focusable.');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Record/ }).click();
    for (const label of ['Record ID', 'Primary record label']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its dynamic structured-definition control.`);
    }
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Views/ }).click();
    assert.equal(await page.getByLabel('submit page label').count(), 1, 'the view editor must retain a label for every generated page.');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Notes/ }).click();
    for (const label of ['Assumptions', 'Open questions']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its structured-definition control.`);
    }

    const navigation = page.getByRole('complementary', { name: 'Console navigation' }).getByLabel('New product');
    await expectFocused(page, navigation, 'the product-lineage navigation control must be keyboard focusable.');
    const definitionTab = page.getByRole('button', { name: /02.*Application definition/ });
    await expectFocused(page, definitionTab, 'the active workflow stage Tab must be keyboard focusable.');
    await page.locator('.definition-editor-nav').getByRole('button', { name: /Record/ }).click();
    await page.getByLabel('Primary record label').fill('Expense claim');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByRole('status').getByText(/Version 2 is now an immutable draft/i).waitFor();
    await page.getByRole('button', { name: 'Approve definition' }).click();
    await page.getByRole('button', { name: 'Create component plan' }).click();
    await page.getByRole('button', { name: 'Retry component plan' }).waitFor();
    await page.getByRole('button', { name: 'Retry component plan' }).click();
    await page.getByRole('button', { name: 'Approve component plan' }).click();
    await page.getByRole('button', { name: 'Queue build' }).click();
    await page.getByRole('status').getByText('Queueing build', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Queue build' }).isDisabled(), true, 'the active mutation must use native disabled semantics on Queue build.');
    assert.equal(await page.getByRole('complementary', { name: 'Console navigation' }).getByLabel('New product').isDisabled(), true, 'conflicting workspace navigation must be natively disabled during a mutation.');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Stop preview' && !button.disabled), undefined, { timeout: 8000 });

    const stop = page.getByRole('button', { name: 'Stop preview' });
    await expectFocused(page, stop, 'the stop-preview control must be keyboard focusable.');
    await resetFocusTrace(page);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Confirm stop' }).isVisible(), true, 'the confirmation Dialog must expose its action.');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await waitForFocusRestore(page, 'Stop preview');
    console.log(`console-next accessibility: dialog focus sequence ${JSON.stringify(await focusTrace(page))}`);
    assert.equal(await stop.evaluate((element) => document.activeElement === element), true, 'closing the Dialog must restore focus to its trigger.');
    assert.equal((await focusTrace(page)).at(-1), 'Stop preview', 'the Dialog focus sequence must finish at its trigger.');

    const evidence = page.locator('#build-evidence-trigger');
    await expectFocused(page, evidence, 'the evidence sheet trigger must be keyboard focusable.');
    await page.keyboard.press('Enter');
    const evidenceSheet = page.getByRole('dialog');
    await evidenceSheet.waitFor();
    assert.equal(await evidenceSheet.getByText('component-lock.json', { exact: true }).count(), 1, 'evidence must expose a visible artifact filename alongside its compact action.');
    const downloadArtifact = evidenceSheet.getByRole('button', { name: 'Download component-lock.json' });
    await expectKeyboardVisibleFocus(page, downloadArtifact, 'the compact artifact download control must retain an accessible visible-focus target.');
    await downloadArtifact.click();
    await page.getByRole('status').getByText('Downloading evidence', { exact: true }).waitFor();
    assert.equal(await downloadArtifact.isDisabled(), true, 'an in-flight evidence download must use native disabled semantics.');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await evidenceSheet.waitFor({ state: 'hidden' });
    await waitForFocusRestoreById(page, 'build-evidence-trigger');

    const lineageTrigger = page.getByRole('button', { name: 'Open product lineage' });
    await lineageTrigger.click();
    const lineageSheet = page.getByRole('dialog');
    await lineageSheet.waitFor();
    const lineageNode = lineageSheet.getByRole('button', { name: 'component: backend.fastapi-crud' });
    await lineageNode.focus();
    await lineageNode.press('Enter');
    assert.equal(await lineageNode.getAttribute('aria-pressed'), 'true', 'Enter must select a keyboard-focused Lineage component node.');
    const lineageSelection = lineageSheet.locator('[data-factory-component="lineage-selection"][role="status"]');
    await lineageSelection.waitFor();
    const lineageSelectionText = await lineageSelection.textContent() || '';
    for (const safeDetail of ['component', 'backend.fastapi-crud', '0.1.0', 'golden']) assert.ok(lineageSelectionText.includes(safeDetail), 'the selected-node status inspector must announce safe component detail.');
    await lineageSheet.getByRole('button', { name: 'Close Product lineage' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null), true, 'Shift+Tab from the first Lineage control must remain inside the modal window.');
    await page.keyboard.press('Escape');
    await lineageSheet.waitFor({ state: 'hidden' });
    await waitForFocusRestoreById(page, 'open-lineage-trigger');
    await page.setViewportSize({ width: 390, height: 844 });
    await lineageTrigger.click();
    await lineageSheet.waitFor();
    const narrowLineageNode = lineageSheet.getByRole('button', { name: 'component: backend.fastapi-crud' });
    await narrowLineageNode.focus();
    await narrowLineageNode.press('Enter');
    assert.equal(await narrowLineageNode.getAttribute('aria-pressed'), 'true', 'Lineage node selection must remain keyboard-operable at 390px.');
    assert.equal(await lineageSheet.locator('[data-factory-component="lineage-selection"][role="status"]').count(), 1, 'the selected-node status inspector must remain present at 390px.');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'selecting a Lineage node at 390px must not overflow the document.');
    assert.equal(await lineageSheet.getByRole('button', { name: 'Close Product lineage' }).isVisible(), true, 'Lineage Close must remain reachable after selecting a node at 390px.');
    assert.ok(await lineageSheet.locator('.react-flow__controls-button').count() > 0, 'React Flow controls must remain reachable after selecting a node at 390px.');
    await page.keyboard.press('Escape');
    await lineageSheet.waitFor({ state: 'hidden' });
    await waitForFocusRestoreById(page, 'open-lineage-trigger');
    await page.setViewportSize({ width: 1280, height: 800 });

    await evidence.click();
    const diagnostics = page.locator('summary', { hasText: 'Run diagnostics' });
    await expectFocused(page, diagnostics, 'the diagnostic Accordion trigger must be keyboard focusable.');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.sheet-list details').evaluate((details) => details.open), true, 'the diagnostic Accordion must be keyboard expandable.');
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      try {
        if (runner) await cleanupOwnedConsoleHarness(server, runner, 'accessibility');
      } finally {
        await fixture.close();
      }
    }
  }
}

async function assertAllFormControlsAreLabelled(page) {
  for (const label of ['Name', 'Describe what should happen']) {
    assert.equal(await page.getByLabel(label).count(), 1, `${label} must have exactly one accessible label.`);
  }
}

async function runOwnedHarnessCleanupRegression() {
  for (const shutdown of ['success', 'early-exit']) {
    const runner = createIsolatedConsoleCopy(`accessibility-${shutdown}`);
    const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    const output = join(runner.copyRoot, runner.distDir);
    const port = await unusedLoopbackPort();
    const lifecycle = [];
    let ownedPid = null;
    async function runOwnedCase() {
      const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
        cwd: runner.copyRoot,
        stdio: 'ignore',
        env: { ...process.env, FACTORY_CONSOLE_DIST_DIR: runner.distDir },
      });
      ownedPid = server.pid;
      try {
        await waitForServer(`http://127.0.0.1:${port}/`, server);
        assert.equal(existsSync(output), true, `owned ${shutdown} runner must create output only inside its copied root.`);
        assertWorkspaceNextEnvUnchanged(runner, `owned ${shutdown} while live`);
        if (shutdown === 'early-exit') throw new Error('forced accessibility runner abort');
      } finally {
        await cleanupOwnedConsoleHarness(server, runner, `owned ${shutdown}`, lifecycle);
      }
    }
    if (shutdown === 'early-exit') {
      await assert.rejects(runOwnedCase(), /forced accessibility runner abort/, 'the actual accessibility runner must abort after mutation and delegate termination to cleanup.');
    } else {
      await runOwnedCase();
    }
    assert.deepEqual(lifecycle, ['owned-root-present', process.platform === 'win32' ? 'tree-termination-succeeded' : 'tree-termination-requested', 'owned-root-absent', 'owned-copy-removed'], `owned ${shutdown} copy removal must follow successful termination and verified absence of the exact owned process tree.`);
    assert.throws(() => process.kill(ownedPid, 0), { code: 'ESRCH' }, `owned ${shutdown} cleanup must verify that its exact owned root PID no longer exists.`);
    assertWorkspaceNextEnvUnchanged(runner, `owned ${shutdown} after cleanup`);
    assert.equal(existsSync(runner.copyRoot), false, `owned ${shutdown} cleanup must remove its copied root.`);
  }
}

async function runNonzeroTaskkillCleanupRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('accessibility-taskkill-failure');
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
    assert.equal(existsSync(output), true, 'the controlled accessibility taskkill failure must start Next and create output only inside its copied root.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled accessibility taskkill failure while live');
    await assert.rejects(
      cleanupOwnedConsoleHarness(
        server,
        runner,
        'controlled nonzero taskkill accessibility',
        lifecycle,
        (command, args, options) => {
          assert.equal(command, 'taskkill', 'controlled failure must intercept only the harness taskkill invocation.');
          assert.deepEqual(args, ['/PID', String(ownedPid), '/T', '/F'], 'controlled failure must retain the exact test-owned root PID target.');
          assert.deepEqual(options, { stdio: 'ignore', windowsHide: true }, 'controlled failure must retain the non-interactive taskkill options.');
          return { error: undefined, status: 1 };
        },
      ),
      /taskkill exited with status 1; refusing cleanup/,
      'a nonzero taskkill result must fail closed even after the short-lived owned PID exits naturally.',
    );
    assert.deepEqual(lifecycle, ['owned-root-present'], 'a nonzero taskkill result must fail before successful termination or cleanup is reported.');
    assert.equal(existsSync(runner.copyRoot), true, 'a nonzero taskkill result must retain the copied accessibility runner for inspection.');
    assert.equal(existsSync(output), true, 'a nonzero taskkill result must retain copied accessibility output for inspection.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled accessibility taskkill failure after fail-closed cleanup');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled nonzero taskkill accessibility recovery')) {
      await terminateOwnedProcessTree(server, 'controlled nonzero taskkill accessibility recovery', recoveryLifecycle);
    }
    assert.equal(ownedRootExists(ownedPid, 'controlled nonzero taskkill accessibility recovered root'), false, 'controlled accessibility recovery must independently verify the exact copied-runner PID is absent.');
    runner.removeOwnedCopy();
    assertWorkspaceNextEnvUnchanged(runner, 'controlled accessibility taskkill failure after recovery');
  }
}

async function runDegradedTaskkillCleanupRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('accessibility-degraded-taskkill');
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
      'controlled degraded-tree accessibility',
      lifecycle,
      (command, args, options) => {
        const actualTermination = spawnSync(command, args, options);
        assert.equal(actualTermination.status, 0, 'the degraded-tree accessibility regression must really terminate only its exact owned dummy root.');
        return { error: undefined, status: 1 };
      },
    );
    assert.deepEqual(lifecycle, ['owned-root-present', 'owned-root-absent', 'owned-copy-removed', 'degraded-tree-termination'], 'a nonzero accessibility taskkill may report degraded success only after exact root absence and validated copy deletion.');
    assert.equal(ownedRootExists(ownedPid, 'controlled degraded-tree accessibility completed root'), false, 'degraded accessibility cleanup must verify the exact owned root PID is absent.');
    assert.equal(existsSync(runner.copyRoot), false, 'degraded accessibility cleanup must delete the exact validated temporary copy.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled degraded-tree accessibility after cleanup');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled degraded-tree accessibility recovery')) spawnSync('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (existsSync(runner.copyRoot)) runner.removeOwnedCopy();
  }
}

async function runDegradedCopyDeletionFailureRegression() {
  if (process.platform !== 'win32') return;
  const runner = createIsolatedConsoleCopy('accessibility-degraded-delete-failure');
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
        'controlled degraded deletion failure accessibility',
        lifecycle,
        (command, args, options) => {
          const actualTermination = spawnSync(command, args, options);
          assert.equal(actualTermination.status, 0, 'the degraded accessibility deletion-failure regression must terminate only its exact owned dummy root.');
          return { error: undefined, status: 1 };
        },
      ),
      /exact validated temporary-copy deletion failed/,
      'degraded accessibility cleanup must fail closed when exact validated copy deletion fails.',
    );
    assert.deepEqual(lifecycle, ['owned-root-present', 'owned-root-absent'], 'failed degraded accessibility deletion must not record copy removal or degraded success.');
    assert.equal(existsSync(runner.copyRoot), true, 'failed degraded accessibility deletion must retain the exact temporary copy.');
    assertWorkspaceNextEnvUnchanged(runner, 'controlled degraded deletion failure accessibility');
  } finally {
    if (ownedRootExists(ownedPid, 'controlled degraded deletion failure accessibility recovery')) spawnSync('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (existsSync(runner.copyRoot)) runner.removeOwnedCopy();
  }
}

if (process.argv.includes('--harness-cleanup-only')) {
  await runOwnedHarnessCleanupRegression();
  await runNonzeroTaskkillCleanupRegression();
  await runDegradedTaskkillCleanupRegression();
  await runDegradedCopyDeletionFailureRegression();
  console.log('console-next harness cleanup: PASS');
} else {
  await runAccessibilityEvidence();
  console.log('console-next accessibility and runtime containment: PASS');
}
