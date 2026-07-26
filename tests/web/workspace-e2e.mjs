import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(
    process.env.FACTORY_PLAYWRIGHT_PATH
      || 'C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
  );
}
const { chromium } = playwright;

const TOKEN = 'fixture-capability';
const NOW = '2026-07-25T10:00:00Z';
const id = (prefix, digit) => `${prefix}_${digit.repeat(32)}`;

function definition(version = '1') {
  return {
    apiVersion: 'factory/v1',
    kind: 'ApplicationDefinition',
    metadata: { name: 'expense-approval', version },
    profile: 'internal-approval-app',
    roles: [
      { id: 'employee', label: 'Employee', kind: 'submitter' },
      { id: 'manager', label: 'Manager', kind: 'approver' },
      { id: 'finance', label: 'Finance', kind: 'auditor' },
    ],
    primary_record: {
      id: 'expense_claim',
      label: 'Expense claim',
      fields: [
        { id: 'amount', label: 'Amount', type: 'number', required: true },
        { id: 'description', label: 'Description', type: 'string', required: true },
      ],
    },
    workflow: {
      id: 'approval',
      states: ['draft', 'submitted', 'approved', 'rejected'],
      transitions: [
        { from: 'draft', to: 'submitted', action: 'submit', actor_kind: 'submitter' },
        { from: 'submitted', to: 'approved', action: 'approve', actor_kind: 'approver' },
        { from: 'submitted', to: 'rejected', action: 'reject', actor_kind: 'approver' },
      ],
    },
    pages: [
      { id: 'submit', label: 'Submit request', kind: 'form', actor_kinds: ['submitter'] },
      { id: 'my_records', label: 'My requests', kind: 'list', actor_kinds: ['submitter'] },
      { id: 'approval_queue', label: 'Approval queue', kind: 'queue', actor_kinds: ['approver'] },
      {
        id: 'audit',
        label: 'Audit <img src=x onerror="window.__labelXss=true">',
        kind: 'audit',
        actor_kinds: ['auditor'],
      },
    ],
    non_functional: { audit_log: true, persistence: 'postgresql', ui: 'responsive_web' },
    assumptions: ['Approver assignment is static in the local preview.'],
    open_questions: ['Should rejected claims be editable?'],
  };
}

function versionView(versionId, value, parent = null) {
  return {
    id: versionId,
    project_id: id('prj', '1'),
    parent_version_id: parent,
    definition: value,
    definition_checksum: `sha256:${'a'.repeat(64)}`,
    brief_checksum: parent ? null : `sha256:${'b'.repeat(64)}`,
    provenance: parent
      ? null
      : {
          provider: 'fixture',
          model: 'fixture-v1',
          reasoning_effort: null,
          response_id: null,
          input_tokens: null,
          output_tokens: null,
          elapsed_ms: 8,
        },
    status: 'draft',
    created_at: NOW,
    approved_at: null,
    approved_by: null,
  };
}

function createFixture() {
  const fixture = {
    project: null,
    artifactToken: null,
    versionCreates: 0,
    planAttempts: 0,
    runReads: new Map(),
    stopReads: new Map(),
    readyReads: new Map(),
    forcedRunState: null,
  };

  const json = (response, status, body, origin) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin || '*',
    });
    response.end(JSON.stringify(body));
  };

  const api = createServer(async (request, response) => {
    const origin = request.headers.origin || '*';
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, X-Factory-Capability',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      response.end();
      return;
    }

    const url = new URL(request.url, 'http://fixture.local');
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    const path = url.pathname;

    if (path === '/__fixture/run-state' && request.method === 'POST') {
      fixture.forcedRunState = body.state;
      return json(response, 200, { ok: true }, origin);
    }

    if (request.method === 'POST' && request.headers['x-factory-capability'] !== TOKEN) {
      return json(response, 401, { error: { code: 'unauthorized', message: 'Capability token is required.' } }, origin);
    }

    if (path === '/api/projects' && request.method === 'GET') {
      const projects = fixture.project
        ? [{
            id: fixture.project.id,
            name: fixture.project.name,
            created_at: NOW,
            latest_version_id: fixture.project.versions.at(-1).id,
            latest_version_status: fixture.project.versions.at(-1).status,
            latest_run_status: fixture.project.runs.at(-1)?.status || null,
          }]
        : [];
      return json(response, 200, { projects }, origin);
    }

    if (path === '/api/projects' && request.method === 'POST') {
      const first = versionView(id('ver', '2'), definition());
      fixture.project = {
        id: id('prj', '1'),
        name: body.name,
        created_at: NOW,
        versions: [first],
        plans: [],
        runs: [],
      };
      return json(response, 201, { project: fixture.project, version: first }, origin);
    }

    if (fixture.project && path === `/api/projects/${fixture.project.id}` && request.method === 'GET') {
      return json(response, 200, { project: fixture.project }, origin);
    }

    if (fixture.project && path === `/api/projects/${fixture.project.id}/versions` && request.method === 'POST') {
      fixture.versionCreates += 1;
      const nextDefinition = structuredClone(body.definition);
      nextDefinition.metadata.version = String(fixture.project.versions.length + 1);
      const child = versionView(id('ver', '3'), nextDefinition, body.base_version_id);
      child.created_at = '2026-07-25T10:03:00Z';
      fixture.project.versions.push(child);
      return json(response, 201, { version: child }, origin);
    }

    const approveVersion = path.match(/^\/api\/versions\/([^/]+)\/approve$/);
    if (approveVersion && request.method === 'POST') {
      const item = fixture.project.versions.find((candidate) => candidate.id === approveVersion[1]);
      item.status = 'approved';
      item.approved_at = '2026-07-25T10:04:00Z';
      item.approved_by = 'fixture-founder';
      return json(response, 200, { version: item }, origin);
    }

    const createPlan = path.match(/^\/api\/versions\/([^/]+)\/plans$/);
    if (createPlan && request.method === 'POST') {
      fixture.planAttempts += 1;
      if (fixture.planAttempts === 1) {
        return json(response, 503, {
          error: { code: 'planner_unavailable', message: 'Fixture planner unavailable. Retry the build plan.' },
        }, origin);
      }
      const selectedVersion = fixture.project.versions.find((candidate) => candidate.id === createPlan[1]);
      const plan = {
        id: id('plan', '4'),
        project_id: fixture.project.id,
        version_id: selectedVersion.id,
        status: 'pending_approval',
        checksum: `sha256:${'c'.repeat(64)}`,
        components: [{
          key: 'backend.fastapi-crud',
          version: '0.2.0',
          artifact_digest: `sha256:${'d'.repeat(64)}`,
          category: 'backend-service',
          trust_level: 'golden',
          requires: ['database.relational'],
          selected_for: 'Renders <img src=x onerror="window.__factoryXss=true"> safely for the approved record.',
          inputs: {
            roles: selectedVersion.definition.roles.map((role) => role.id),
            primary_record: {
              id: selectedVersion.definition.primary_record.id,
              label: selectedVersion.definition.primary_record.label,
              field_ids: selectedVersion.definition.primary_record.fields.map((field) => field.id),
            },
            pages: selectedVersion.definition.pages.map((page) => page.label),
            workflow: 'approval',
          },
        }],
        known_profile_limit: 'One submitter-to-approver workflow with append-only audit history.',
        artifact_checklist: [
          'application-definition.json',
          'component-lock.json',
          'render-manifest.json',
          'run-summary.json',
          'executor-request.json',
        ],
        created_at: NOW,
        approved_at: null,
        approved_by: null,
      };
      fixture.project.plans.push(plan);
      return json(response, 201, { plan }, origin);
    }

    const approvePlan = path.match(/^\/api\/plans\/([^/]+)\/approve$/);
    if (approvePlan && request.method === 'POST') {
      const plan = fixture.project.plans.find((candidate) => candidate.id === approvePlan[1]);
      plan.status = 'approved';
      plan.approved_at = '2026-07-25T10:05:00Z';
      plan.approved_by = 'fixture-founder';
      return json(response, 200, { plan }, origin);
    }

    const createRun = path.match(/^\/api\/plans\/([^/]+)\/runs$/);
    if (createRun && request.method === 'POST') {
      const runNumber = fixture.project.runs.length + 1;
      const runId = id('run', String(runNumber + 4));
      const run = {
        id: runId,
        plan_id: createRun[1],
        status: 'queued',
        created_at: NOW,
        finished_at: null,
        expires_at: '2026-07-25T10:30:00Z',
        phase: 'queued',
        stop_reason: null,
        preview_url: null,
        executor: { status: 'offline', message: 'Start the local Executor.', last_heartbeat_at: null },
        log_excerpt: ['Build request queued.'],
        smoke: null,
        artifacts: [{
          id: 'component-lock',
          path: 'component-lock.json',
          sha256: `sha256:${'e'.repeat(64)}`,
          kind: 'component_lock',
          url: `/api/runs/${runId}/artifacts/component-lock`,
        }],
        events: [{ sequence: 1, type: 'run.queued', at: NOW, payload: { message: 'Queued.' } }],
      };
      fixture.project.runs.push(run);
      fixture.runReads.set(run.id, 0);
      fixture.stopReads.set(run.id, 0);
      fixture.readyReads.set(run.id, 0);
      return json(response, 201, { run }, origin);
    }

    const getRun = path.match(/^\/api\/runs\/([^/]+)$/);
    if (getRun && request.method === 'GET') {
      const run = fixture.project.runs.find((candidate) => candidate.id === getRun[1]);
      const reads = (fixture.runReads.get(run.id) || 0) + 1;
      fixture.runReads.set(run.id, reads);
      if (fixture.forcedRunState === 'failed' && run === fixture.project.runs.at(-1)) {
        Object.assign(run, {
          status: 'failed',
          phase: 'failed',
          finished_at: '2026-07-25T10:08:00Z',
          preview_url: null,
          executor: { status: 'online', message: null, last_heartbeat_at: '2026-07-25T10:07:59Z' },
          log_excerpt: ['Smoke test failed.'],
          smoke: { status: 'failed', started_at: NOW, finished_at: NOW, summary: 'Approval queue did not load.' },
        });
      } else if (run.phase === 'stopping') {
        const stopReads = (fixture.stopReads.get(run.id) || 0) + 1;
        fixture.stopReads.set(run.id, stopReads);
        if (stopReads >= 2) {
          Object.assign(run, {
            status: 'stopped',
            phase: 'stopped',
            stop_reason: 'requested',
            finished_at: '2026-07-25T10:09:00Z',
            preview_url: null,
          });
        }
      } else if (run.status === 'ready' && fixture.project.runs.indexOf(run) === 1) {
        const readyReads = (fixture.readyReads.get(run.id) || 0) + 1;
        fixture.readyReads.set(run.id, readyReads);
        if (readyReads >= 3) {
          Object.assign(run, {
            status: 'stopped',
            phase: 'stopped',
            stop_reason: 'expired',
            finished_at: '2026-07-25T10:31:00Z',
            preview_url: null,
          });
        }
      } else if (reads >= 3 && run.status !== 'stopped') {
        Object.assign(run, {
          status: 'ready',
          phase: 'ready',
          preview_url: fixture.previewUrl,
          executor: { status: 'online', message: null, last_heartbeat_at: '2026-07-25T10:06:00Z' },
          log_excerpt: ['Image built.', 'Smoke test passed.'],
          smoke: { status: 'passed', started_at: NOW, finished_at: NOW, summary: 'Submit, approve, and audit passed.' },
        });
      } else if (run.status !== 'stopped') {
        run.status = 'building';
        run.phase = 'building';
      }
      return json(response, 200, { run }, origin);
    }

    const artifact = path.match(/^\/api\/runs\/([^/]+)\/artifacts\/([^/]+)$/);
    if (artifact && request.method === 'GET') {
      fixture.artifactToken = request.headers['x-factory-capability'];
      if (fixture.artifactToken !== TOKEN) {
        return json(response, 401, { error: { code: 'unauthorized', message: 'Capability token is required.' } }, origin);
      }
      response.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="component-lock.json"',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': origin,
      });
      response.end('{"components":["backend.fastapi-crud"]}\n');
      return;
    }

    const stop = path.match(/^\/api\/runs\/([^/]+)\/stop$/);
    if (stop && request.method === 'POST') {
      const run = fixture.project.runs.find((candidate) => candidate.id === stop[1]);
      Object.assign(run, {
        phase: 'stopping',
      });
      return json(response, 202, { run }, origin);
    }

    return json(response, 404, { error: { code: 'not_found', message: 'Fixture route was not found.' } }, origin);
  });

  return { api, fixture };
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function startRealFixtureApi(allowedOrigin) {
  const stateRoot = await mkdtemp(join(tmpdir(), 'factory-pilot-browser-api-'));
  const script = `
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from apps.api.control_plane import ControlPlane
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider
from apps.api.server import Handler

root = Path(sys.argv[1])
Handler.control_plane = ControlPlane(
    root / "state.json",
    root / "runs",
    provider=FixtureRequirementToDefinitionProvider(),
)
Handler.capability_token = sys.argv[2]
Handler.authenticated_actor = "browser-fixture"
Handler.allowed_origin = sys.argv[3]
server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
print(f"PORT={server.server_port}", flush=True)
server.serve_forever()
`;
  const child = spawn(
    process.env.FACTORY_PYTHON_PATH || 'python',
    ['-u', '-c', script, stateRoot, TOKEN, allowedOrigin],
    { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timeout = setTimeout(() => reject(new Error(`fixture API did not start: ${stderr}`)), 10000);
    child.once('error', reject);
    child.once('exit', (code) => {
      reject(new Error(`fixture API exited with ${code}: ${stderr}`));
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const match = stdout.match(/PORT=(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });
  return {
    port,
    async close() {
      if (child.exitCode === null) {
        child.kill();
        await once(child, 'exit');
      }
      await rm(stateRoot, { recursive: true, force: true });
    },
  };
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

async function main() {
  const { api, fixture } = createFixture();
  const apiPort = await listen(api);
  const webRoot = join(process.cwd(), 'apps', 'web');
  const web = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://fixture.local').pathname;
    if (pathname === '/preview') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><title>Generated preview</title><h1>Expense approval preview</h1>');
      return;
    }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['index.html', 'app.js', 'styles.css'].includes(file)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] });
    response.end(await readFile(join(webRoot, file)));
  });
  const webPort = await listen(web);
  fixture.previewUrl = `http://127.0.0.1:${webPort}/preview`;
  const realFixtureApi = await startRealFixtureApi(`http://127.0.0.1:${webPort}`);

  const installedChrome = [
    process.env.FACTORY_BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find((candidate) => candidate && existsSync(candidate));
  const browser = await chromium.launch({
    headless: true,
    ...(installedChrome ? { executablePath: installedChrome } : {}),
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.addInitScript((base) => {
    window.FACTORY_API_BASE = base;
  }, `http://127.0.0.1:${apiPort}/api`);

  try {
    const normalizedPage = await context.newPage();
    await normalizedPage.addInitScript((base) => {
      window.FACTORY_API_BASE = base;
    }, `http://127.0.0.1:${realFixtureApi.port}/api`);
    await normalizedPage.goto(`http://127.0.0.1:${webPort}/`);
    await normalizedPage.getByText('Local connection', { exact: true }).click();
    await normalizedPage.getByLabel('Local session capability').fill(TOKEN);
    await normalizedPage.getByLabel('Project name').fill('Invalid project name!');
    assert.equal(
      await normalizedPage.getByLabel('Project name').evaluate((input) => input.validity.patternMismatch),
      true,
      'the native form pattern must reject project names outside the frozen identifier shape',
    );
    await normalizedPage.getByLabel('Project name').fill('expense-approval');
    await normalizedPage.getByLabel('Requirement brief').fill('Employees submit expense claims and managers approve them.');
    await normalizedPage.getByRole('button', { name: 'Generate application definition' }).click();
    await normalizedPage.getByRole('heading', { name: 'Application definition' }).waitFor();
    await normalizedPage.getByRole('button', { name: 'Create next version' }).click();
    await normalizedPage.locator('.version-item.is-selected').filter({ hasText: 'Version 2' }).waitFor();
    await normalizedPage.evaluate(() => {
      state.workingDefinition.workflow.transitions[0].to = 'approved';
    });
    await normalizedPage.getByRole('button', { name: 'Create next version' }).click();
    await normalizedPage.getByText('The Golden approval lifecycle cannot be changed.', { exact: true }).waitFor();
    assert.equal(await normalizedPage.locator('.version-item').count(), 2, 'an unauthorized workflow mutation must not create a child version');
    await normalizedPage.close();
    console.log('workspace e2e: API-normalized workflow order and frozen lifecycle PASS');

    await page.goto(`http://127.0.0.1:${webPort}/`);
    await page.getByText('Local connection', { exact: true }).click();
    await page.getByLabel('Local session capability').fill(TOKEN);
    await page.getByLabel('Project name').fill('expense-approval');
    await page.getByLabel('Requirement brief').fill('Employees submit expenses, managers approve them, and finance audits every decision.');
    await page.getByRole('button', { name: 'Generate application definition' }).click();

    await page.getByRole('heading', { name: 'Application definition' }).waitFor();
    await page.getByText('Audit <img src=x onerror="window.__labelXss=true">', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__labelXss), undefined, 'a model-supplied label must render only as text');
    await page.getByLabel('audit page label').fill('Audit history');

    await page.getByRole('button', { name: 'Add role' }).click();
    await page.locator('.page-card').filter({ hasText: 'Audit history' }).getByText('audit · auditor, observer', { exact: true }).waitFor();
    await page.locator('.role-card').nth(2).getByRole('button', { name: 'Remove' }).click();
    await page.locator('.page-card').filter({ hasText: 'Audit history' }).getByText('audit · observer', { exact: true }).waitFor();
    await page.locator('.role-card').last().getByRole('button', { name: 'Remove' }).click();
    await page.locator('.page-card').filter({ hasText: 'Audit history' }).getByText('audit · approver', { exact: true }).waitFor();

    await page.getByLabel('Primary record label').fill('Travel expense');
    await page.locator('[data-field-label]').first().fill('Claim amount');

    await page.getByLabel('Record ID').fill('system');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByText('Identifiers cannot use reserved names.', { exact: true }).waitFor();
    assert.equal(fixture.versionCreates, 0, 'reserved identifiers must fail before an API request');
    await page.getByLabel('Record ID').fill('expense_claim');
    await page.locator('[data-field-label]').first().fill('API key: copied');
    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.getByText('Definition text cannot contain credential assignments.', { exact: true }).waitFor();
    assert.equal(fixture.versionCreates, 0, 'credential-like labels must fail before an API request');
    await page.locator('[data-field-label]').first().fill('Claim amount');

    await page.getByRole('button', { name: 'Create next version' }).click();
    await page.locator('.version-item.is-selected').filter({ hasText: 'Version 2' }).waitFor();
    assert.deepEqual(
      fixture.project.versions.at(-1).definition.pages.find((item) => item.id === 'audit').actor_kinds,
      ['approver'],
      'the child version must carry deterministic audit-page actor coverage',
    );
    console.log('workspace e2e: safe labels, profile validation, and audit coverage PASS');

    await page.getByRole('button', { name: 'Approve application definition' }).click();
    await page.getByRole('button', { name: 'Create build plan' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Create build plan' }).waitFor();
    await page.getByText('Local connection', { exact: true }).click();
    await page.getByLabel('Local session capability').fill(TOKEN);
    await page.getByRole('button', { name: 'Create build plan' }).click();
    await page.getByText('Fixture planner unavailable. Retry the build plan.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Retry build plan' }).click();
    await page.getByRole('heading', { name: 'Build plan' }).waitFor();
    const componentCard = page.locator('.component-card').filter({ hasText: 'backend.fastapi-crud' });
    await componentCard.getByText('golden', { exact: true }).waitFor();
    await componentCard.getByText('database.relational', { exact: true }).waitFor();
    await componentCard.getByText('Travel expense', { exact: true }).waitFor();
    await componentCard.getByText('expense_claim', { exact: true }).waitFor();
    await componentCard.getByText('approval', { exact: true }).waitFor();
    await page.getByText('Renders <img src=x onerror="window.__factoryXss=true"> safely for the approved record.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__factoryXss), undefined, 'model-controlled component text must not execute as HTML');
    console.log('workspace e2e: recoverable plan creation and complete component inputs PASS');

    await page.getByRole('button', { name: 'Approve build plan' }).click();
    await page.getByRole('button', { name: 'Queue local build' }).click();
    await page.getByText('Executor offline', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Open preview' }).isDisabled(), true);
    await page.getByText('Preview ready', { exact: true }).waitFor({ timeout: 8000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download component-lock.json' }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'component-lock.json');
    assert.equal(fixture.artifactToken, TOKEN, 'artifact downloads must carry the live capability token');

    const previewPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Open preview' }).click();
    const preview = await previewPromise;
    await preview.waitForLoadState();
    assert.equal(preview.url(), fixture.previewUrl);
    await preview.close();

    await page.getByRole('button', { name: 'Stop preview' }).click();
    await page.getByText('Stopping preview', { exact: true }).waitFor();
    await page.getByText('Stopped by request', { exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Queue another local build' }).click();
    await page.locator('.run-item').filter({ hasText: 'Run 2' }).waitFor();
    await page.getByText('Preview ready', { exact: true }).waitFor({ timeout: 8000 });
    await page.getByText('Preview expired', { exact: true }).waitFor({ timeout: 8000 });
    await page.locator('.run-item').filter({ hasText: 'Run 1' }).click();
    await page.getByText('Stopped by request', { exact: true }).waitFor();

    await page.getByRole('button', { name: 'Queue another local build' }).click();
    await fetch(`http://127.0.0.1:${apiPort}/__fixture/run-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'failed' }),
    });
    await page.getByText('Build failed', { exact: true }).waitFor({ timeout: 8000 });
    await page.reload();
    await page.getByText('Build failed', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Local session capability').inputValue(), '', 'the capability token must not survive reload');
    await page.locator('.version-item.is-selected').filter({ hasText: 'Version 2' }).waitFor();
    await page.locator('.run-item').filter({ hasText: 'Run 2' }).click();
    await page.getByText('Preview expired', { exact: true }).waitFor();
    console.log('workspace e2e: async stop, ready expiry, run history, and retry PASS');

    console.log('workspace e2e: PASS');
  } finally {
    await browser.close();
    await realFixtureApi.close();
    await close(api);
    await close(web);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
