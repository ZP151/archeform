import { createServer } from 'node:http';

const now = '2026-07-26T10:00:00Z';
const token = 'fixture-capability';

function response(res, origin, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || 'http://127.0.0.1:5173',
    'Access-Control-Allow-Headers': 'Content-Type, X-Factory-Capability',
  });
  res.end(JSON.stringify(body));
}

function definition(name, version = '1') {
  return {
    apiVersion: 'factory/v1', kind: 'Application',
    metadata: { name, version }, profile: 'internal-workflow-app',
    primary_record: { id: 'request', label: 'Approval request', fields: [{ id: 'reason', label: 'Reason', type: 'string', required: true }] },
    roles: [{ id: 'employee', label: 'Employee', kind: 'submitter' }, { id: 'manager', label: 'Manager', kind: 'approver' }],
    pages: [
      { id: 'submit', label: 'Submit request', kind: 'form', actor_kinds: ['submitter'] },
      { id: 'my_records', label: 'My requests', kind: 'list', actor_kinds: ['submitter'] },
      { id: 'approval_queue', label: 'Approval queue', kind: 'queue', actor_kinds: ['approver'] },
      { id: 'audit', label: 'Audit history', kind: 'audit', actor_kinds: ['approver'] },
    ],
    assumptions: [],
    open_questions: [],
  };
}

export async function startFixtureControlPlane(options = {}) {
  const {
    initialProjects = [],
    failInitialProjectsOnce = false,
    delayInitialProjectsMs = 0,
    delayProjectLoadMs = 0,
    failRunPollOnce = false,
    runCreateDelayMs = 0,
    stopDelayMs = 0,
    artifactDelayMs = 0,
  } = options;
  const state = {
    projects: [], planAttempts: 0, previewOpened: false, artifactToken: '',
    initialProjectsRequests: 0, projectLoadRequests: 0, runCreateRequests: 0, runPollRequests: 0, stopRequests: 0,
  };
  let sequence = 0;
  const id = (kind) => `${kind}_${++sequence}`;
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  let initialProjectsShouldFail = failInitialProjectsOnce;
  let runPollShouldFail = failRunPollOnce;
  for (const entry of initialProjects) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const project = { id: id('project'), name, versions: [], plans: [], runs: [] };
    project.versions.push({ id: id('version'), status: 'draft', created_at: now, definition: definition(name) });
    state.projects.push(project);
  }
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (req.method === 'OPTIONS') return response(res, origin, 204, {});
    const body = await new Promise((resolve) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => resolve(raw ? JSON.parse(raw) : {})); });
    const url = new URL(req.url, 'http://fixture.local'); const path = url.pathname;
    console.log(`fixture-control-plane: ${req.method} ${path}`);
    const needsCapability = path.startsWith('/api/');
    if (needsCapability && req.headers['x-factory-capability'] !== token) return response(res, origin, 401, { error: { message: 'Capability token is required.' } });
    if (path === '/api/projects' && req.method === 'GET') {
      state.initialProjectsRequests += 1;
      if (delayInitialProjectsMs) await wait(delayInitialProjectsMs);
      if (initialProjectsShouldFail) { initialProjectsShouldFail = false; return response(res, origin, 503, { error: { message: 'Fixture project index is temporarily unavailable.' } }); }
      return response(res, origin, 200, { projects: state.projects.map(({ id: projectId, name }) => ({ id: projectId, name })) });
    }
    if (path === '/api/projects' && req.method === 'POST') {
      const project = { id: id('project'), name: body.name, versions: [], plans: [], runs: [] };
      const version = { id: id('version'), status: 'draft', created_at: now, definition: definition(body.name) }; project.versions.push(version); state.projects.push(project);
      return response(res, origin, 201, { project, version });
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch && req.method === 'GET') {
      state.projectLoadRequests += 1;
      if (delayProjectLoadMs) await wait(delayProjectLoadMs);
      const project = state.projects.find((item) => item.id === projectMatch[1]); return project ? response(res, origin, 200, { project }) : response(res, origin, 404, { error: { message: 'Project not found.' } });
    }
    const childMatch = path.match(/^\/api\/projects\/([^/]+)\/versions$/);
    if (childMatch && req.method === 'POST') {
      const project = state.projects.find((item) => item.id === childMatch[1]); const version = { id: id('version'), status: 'draft', created_at: now, definition: body.definition, parent_version_id: body.base_version_id }; project.versions.push(version); return response(res, origin, 201, { version });
    }
    const approveVersion = path.match(/^\/api\/versions\/([^/]+)\/approve$/);
    if (approveVersion && req.method === 'POST') { for (const project of state.projects) { const version = project.versions.find((item) => item.id === approveVersion[1]); if (version) { version.status = 'approved'; return response(res, origin, 200, { version }); } } }
    const planMatch = path.match(/^\/api\/versions\/([^/]+)\/plans$/);
    if (planMatch && req.method === 'POST') {
      state.planAttempts += 1; if (state.planAttempts === 1) return response(res, origin, 503, { error: { message: 'Fixture planner unavailable. Retry the build plan.' } });
      for (const project of state.projects) { const version = project.versions.find((item) => item.id === planMatch[1]); if (version) { const plan = { id: id('plan'), version_id: version.id, status: 'draft', components: [{ key: 'backend.fastapi-crud', version: '0.1.0', trust_level: 'golden' }] }; project.plans.push(plan); return response(res, origin, 201, { plan }); } }
    }
    const approvePlan = path.match(/^\/api\/plans\/([^/]+)\/approve$/);
    if (approvePlan && req.method === 'POST') { for (const project of state.projects) { const plan = project.plans.find((item) => item.id === approvePlan[1]); if (plan) { plan.status = 'approved'; return response(res, origin, 200, { plan }); } } }
    const createRun = path.match(/^\/api\/plans\/([^/]+)\/runs$/);
    if (createRun && req.method === 'POST') { state.runCreateRequests += 1; if (runCreateDelayMs) await wait(runCreateDelayMs); for (const project of state.projects) { const plan = project.plans.find((item) => item.id === createRun[1]); if (plan) { const run = { id: id('run'), plan_id: plan.id, status: 'queued', phase: 'queued', executor: { status: 'online' }, artifacts: [{ id: 'component-lock', path: 'component-lock.json', url: `/api/runs/pending/artifacts/component-lock` }] }; run.artifacts[0].url = `/api/runs/${run.id}/artifacts/component-lock`; project.runs.push(run); return response(res, origin, 201, { run }); } } }
    const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch && req.method === 'GET') { state.runPollRequests += 1; if (runPollShouldFail) { runPollShouldFail = false; return response(res, origin, 503, { error: { message: 'Fixture run status is temporarily unavailable.' } }); } for (const project of state.projects) { const run = project.runs.find((item) => item.id === runMatch[1]); if (run) { if (run.phase === 'stopping') { run.phase = 'stopped'; run.status = 'stopped'; run.preview_url = null; } else if (run.status !== 'stopped') { run.phase = 'ready'; run.status = 'ready'; run.preview_url = 'http://127.0.0.1:5173/fixture-preview'; } return response(res, origin, 200, { run }); } } }
    const artifact = path.match(/^\/api\/runs\/([^/]+)\/artifacts\/([^/]+)$/);
    if (artifact && req.method === 'GET') { if (artifactDelayMs) await wait(artifactDelayMs); state.artifactToken = req.headers['x-factory-capability']; res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="component-lock.json"', 'Access-Control-Allow-Origin': origin || 'http://127.0.0.1:5173' }); return res.end('{"components":["backend.fastapi-crud"]}\n'); }
    const stopMatch = path.match(/^\/api\/runs\/([^/]+)\/stop$/);
    if (stopMatch && req.method === 'POST') { state.stopRequests += 1; if (stopDelayMs) await wait(stopDelayMs); for (const project of state.projects) { const run = project.runs.find((item) => item.id === stopMatch[1]); if (run) { run.phase = 'stopping'; return response(res, origin, 202, { run }); } } }
    return response(res, origin, 404, { error: { message: 'Fixture route was not found.' } });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return { token, state, base: `http://127.0.0.1:${port}/api`, close: () => { server.closeAllConnections?.(); return new Promise((resolve) => server.close(resolve)); } };
}
