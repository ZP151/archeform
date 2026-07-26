const API = window.FACTORY_API_BASE || 'http://127.0.0.1:8080/api';
const POLL_INTERVAL_MS = 750;
const TERMINAL_RUN_STATES = new Set(['failed', 'stopped']);
const ACTIVE_RUN_STATES = new Set(['queued', 'building', 'smoke_testing', 'ready']);
const PROFILE = {
  roleKinds: ['submitter', 'approver', 'auditor', 'observer'],
  fieldTypes: ['string', 'number', 'date', 'enum'],
  maxRoles: 5,
  maxFields: 8,
  maxOptions: 12,
  maxStatements: 12,
  maxLabelLength: 80,
};
const RESERVED_IDENTIFIERS = new Set([
  'id', 'status', 'created_at', 'updated_at', 'deleted_at', 'actor', 'role',
  'admin', 'root', 'system', 'api', 'metadata', 'workflow', 'page', 'plan', 'run',
]);
const CREDENTIAL_ASSIGNMENT = /(?:api[_ -]?key|secret|password|token|private[_ -]?key)\s*[:=]/i;

const state = {
  projects: [],
  project: null,
  version: null,
  workingDefinition: null,
  plan: null,
  run: null,
  stage: 'brief',
  pollGeneration: 0,
};

const $ = (id) => document.getElementById(id);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function clear(node) {
  node.replaceChildren();
  return node;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function structurallyEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => structurallyEqual(value, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== 'object'
    || typeof right !== 'object'
  ) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(right, key) && structurallyEqual(left[key], right[key]));
}

function errorMessage(error) {
  return error?.error?.message
    || error?.message
    || 'Unable to reach the local control plane. Confirm that it is running on this computer.';
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = $('capability-token').value;
  if (token) headers['X-Factory-Capability'] = token;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw body;
  return body;
}

function setNotice(message, kind = 'info') {
  const notice = $('workspace-notice');
  notice.textContent = message || '';
  notice.className = `notice ${kind}${message ? '' : ' hidden'}`;
}

function setError(stage, error) {
  $(`${stage}-error`).textContent = error ? errorMessage(error) : '';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? '—'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatDuration(start, finish) {
  const startMs = Date.parse(start);
  const endMs = finish ? Date.parse(finish) : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return '—';
  const seconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function shortId(value) {
  return value ? value.slice(0, 13) : '—';
}

function setStage(name) {
  const available = {
    brief: true,
    definition: Boolean(state.version),
    plan: Boolean(state.plan),
    build: Boolean(state.plan?.status === 'approved'),
  };
  if (!available[name]) {
    const guidance = name === 'definition'
      ? 'Generate a definition first.'
      : name === 'plan'
        ? 'Approve an application definition first.'
        : 'Approve the build plan first.';
    setNotice(guidance, 'info');
    return;
  }
  state.stage = name;
  document.querySelectorAll('.stage-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== `stage-${name}`);
  });
  document.querySelectorAll('[data-stage-target]').forEach((button) => {
    const stages = ['brief', 'definition', 'plan', 'build'];
    button.classList.toggle('active', stages.indexOf(button.dataset.stageTarget) <= stages.indexOf(name));
    button.setAttribute('aria-current', button.dataset.stageTarget === name ? 'step' : 'false');
  });
}

function persistSelection() {
  if (state.project) localStorage.setItem('factory.selectedProject', state.project.id);
  if (state.version) localStorage.setItem('factory.selectedVersion', state.version.id);
}

function renderProjects() {
  const list = clear($('project-list'));
  if (!state.projects.length) {
    list.append(element('p', 'sidebar-empty', 'No projects yet.'));
    return;
  }
  for (const project of state.projects) {
    const button = element('button', `project-item${state.project?.id === project.id ? ' is-selected' : ''}`);
    button.type = 'button';
    button.dataset.projectId = project.id;
    const heading = element('span', 'item-title', project.name);
    const meta = element('span', 'item-meta');
    meta.append(
      element('span', `status-dot ${project.latest_run_status || project.latest_version_status || 'draft'}`),
      document.createTextNode(project.latest_run_status || project.latest_version_status || 'draft'),
    );
    button.append(heading, meta);
    button.addEventListener('click', () => loadProject(project.id));
    list.append(button);
  }
}

function renderVersions() {
  const list = clear($('version-list'));
  $('version-heading').textContent = state.project?.name || 'No project selected';
  if (!state.project) {
    list.append(element('p', 'sidebar-empty', 'Select a project.'));
    return;
  }
  for (const version of [...state.project.versions].reverse()) {
    const button = element('button', `version-item${state.version?.id === version.id ? ' is-selected' : ''}`);
    button.type = 'button';
    button.dataset.versionId = version.id;
    const row = element('span', 'version-row');
    row.append(
      element('strong', '', `Version ${version.definition.metadata.version}`),
      element('span', `status-chip ${version.status}`, version.status),
    );
    button.append(
      row,
      element('span', 'lineage', version.parent_version_id ? `Child of ${shortId(version.parent_version_id)}` : 'Initial model version'),
      element('span', 'timestamp', formatDate(version.created_at)),
    );
    button.addEventListener('click', () => selectVersion(version.id));
    list.append(button);
  }
}

function updateEvidence() {
  $('evidence-json').textContent = JSON.stringify({
    version: state.version,
    plan: state.plan,
    run: state.run,
  }, null, 2);
}

function selectVersion(versionId, preferredStage) {
  if (!state.project) return;
  const version = state.project.versions.find((candidate) => candidate.id === versionId);
  if (!version) return;
  state.pollGeneration += 1;
  state.version = version;
  state.workingDefinition = clone(version.definition);
  state.plan = [...state.project.plans].reverse().find((plan) => plan.version_id === version.id) || null;
  state.run = state.plan
    ? [...state.project.runs].reverse().find((run) => run.plan_id === state.plan.id) || null
    : null;
  persistSelection();
  renderVersions();
  renderDefinition();
  renderPlan();
  renderRun();
  updateEvidence();
  const inferredStage = state.run
    ? 'build'
    : state.plan
      ? 'plan'
      : 'definition';
  setStage(preferredStage || inferredStage);
  if (state.run) refreshRun(state.run.id, true);
}

async function loadProjects() {
  try {
    const { projects } = await request('/projects');
    state.projects = projects;
    renderProjects();
    const remembered = localStorage.getItem('factory.selectedProject');
    const selected = projects.find((project) => project.id === remembered) || projects[0];
    if (selected) await loadProject(selected.id);
    else {
      renderVersions();
      setStage('brief');
    }
  } catch (error) {
    setNotice(errorMessage(error), 'error');
    renderProjects();
    renderVersions();
  }
}

async function loadProject(projectId, selectedVersionId) {
  try {
    const { project } = await request(`/projects/${projectId}`);
    state.project = project;
    const summaryIndex = state.projects.findIndex((candidate) => candidate.id === project.id);
    const latestVersion = project.versions.at(-1);
    const latestRun = project.runs.at(-1);
    const summary = {
      id: project.id,
      name: project.name,
      created_at: project.created_at,
      latest_version_id: latestVersion?.id || null,
      latest_version_status: latestVersion?.status || null,
      latest_run_status: latestRun?.status || null,
    };
    if (summaryIndex >= 0) state.projects[summaryIndex] = summary;
    else state.projects.push(summary);
    renderProjects();
    const remembered = selectedVersionId || localStorage.getItem('factory.selectedVersion');
    const selected = project.versions.find((version) => version.id === remembered) || latestVersion;
    if (selected) selectVersion(selected.id);
  } catch (error) {
    setNotice(errorMessage(error), 'error');
  }
}

function labelledInput(labelText, value, onInput, options = {}) {
  const wrapper = element('div', 'editor-control');
  const label = element('label', '', labelText);
  const input = element(options.tag || 'input', options.className || '');
  if (options.type) input.type = options.type;
  if (options.readOnly) input.readOnly = true;
  input.value = value ?? '';
  input.addEventListener(options.event || 'input', () => onInput(options.type === 'checkbox' ? input.checked : input.value));
  if (options.type === 'checkbox') input.checked = Boolean(value);
  label.append(input);
  wrapper.append(label);
  return { wrapper, input };
}

function choiceControl(labelText, value, choices, onChange) {
  const wrapper = element('div', 'editor-control');
  const label = element('label', '', labelText);
  const select = element('select');
  for (const choice of choices) {
    const option = element('option', '', choice);
    option.value = choice;
    option.selected = choice === value;
    select.append(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  label.append(select);
  wrapper.append(label);
  return wrapper;
}

function expectedAuditActorKinds(definition) {
  const roleKinds = new Set(definition.roles.map((role) => role.kind));
  const auditKinds = ['auditor', 'observer'].filter((kind) => roleKinds.has(kind));
  return auditKinds.length ? auditKinds : ['approver'];
}

function synchronizeAuditCoverage() {
  if (!state.workingDefinition) return;
  const auditPage = state.workingDefinition.pages.find((page) => page.id === 'audit');
  if (auditPage) auditPage.actor_kinds = expectedAuditActorKinds(state.workingDefinition);
}

function renderRoleEditor() {
  const container = clear($('role-editor'));
  state.workingDefinition.roles.forEach((role, index) => {
    const card = element('div', 'editor-card role-card');
    const controls = element('div', 'form-grid three');
    controls.append(
      labelledInput('Role ID', role.id, (value) => { role.id = value; }).wrapper,
      labelledInput('Label', role.label, (value) => { role.label = value; }).wrapper,
      choiceControl('Responsibility', role.kind, PROFILE.roleKinds, (value) => {
        role.kind = value;
        synchronizeAuditCoverage();
        renderPageEditor();
      }),
    );
    const remove = element('button', 'remove-button', 'Remove');
    remove.type = 'button';
    remove.disabled = state.workingDefinition.roles.length <= 2;
    remove.addEventListener('click', () => {
      state.workingDefinition.roles.splice(index, 1);
      synchronizeAuditCoverage();
      renderRoleEditor();
      renderPageEditor();
    });
    card.append(controls, remove);
    container.append(card);
  });
  $('add-role').disabled = state.workingDefinition.roles.length >= PROFILE.maxRoles;
}

function renderFieldEditor() {
  const container = clear($('field-editor'));
  state.workingDefinition.primary_record.fields.forEach((field, index) => {
    const card = element('div', 'editor-card field-card');
    const controls = element('div', 'form-grid field-grid');
    const idControl = labelledInput('Field ID', field.id, (value) => { field.id = value; });
    const labelControl = labelledInput('Label', field.label, (value) => { field.label = value; });
    labelControl.input.dataset.fieldLabel = '';
    controls.append(
      idControl.wrapper,
      labelControl.wrapper,
      choiceControl('Type', field.type, PROFILE.fieldTypes, (value) => {
        field.type = value;
        if (value === 'enum') field.options = field.options || ['Option'];
        else delete field.options;
        renderFieldEditor();
      }),
    );
    const required = labelledInput('Required', field.required, (value) => { field.required = value; }, { type: 'checkbox', event: 'change' });
    required.wrapper.classList.add('checkbox-control');
    controls.append(required.wrapper);
    if (field.type === 'enum') {
      const options = labelledInput('Options (comma separated)', (field.options || []).join(', '), (value) => {
        field.options = value.split(',').map((item) => item.trim()).filter(Boolean);
      });
      options.wrapper.classList.add('span-two');
      controls.append(options.wrapper);
    }
    const remove = element('button', 'remove-button', 'Remove');
    remove.type = 'button';
    remove.disabled = state.workingDefinition.primary_record.fields.length <= 1;
    remove.addEventListener('click', () => {
      state.workingDefinition.primary_record.fields.splice(index, 1);
      renderFieldEditor();
    });
    card.append(controls, remove);
    container.append(card);
  });
  $('add-field').disabled = state.workingDefinition.primary_record.fields.length >= PROFILE.maxFields;
}

function renderPageEditor() {
  const container = clear($('page-editor'));
  for (const page of state.workingDefinition.pages) {
    const card = element('div', 'page-card');
    const heading = element('div');
    heading.append(element('strong', '', page.label), element('span', '', `${page.kind} · ${page.actor_kinds.join(', ')}`));
    const input = element('input');
    input.value = page.label;
    input.setAttribute('aria-label', `${page.kind} page label`);
    input.addEventListener('input', () => {
      page.label = input.value;
      heading.querySelector('strong').textContent = input.value;
    });
    card.append(heading, input);
    container.append(card);
  }
}

function renderWorkflow() {
  const flow = clear($('workflow-summary'));
  for (const stateName of state.workingDefinition.workflow.states) {
    flow.append(element('span', '', stateName));
    if (stateName === 'draft') flow.append(element('i', '', 'submit →'));
    if (stateName === 'submitted') flow.append(element('i', '', 'approve / reject →'));
  }
}

function renderDefinition() {
  if (!state.version || !state.workingDefinition) return;
  const definition = state.workingDefinition;
  $('definition-status').textContent = state.version.status;
  $('definition-status').className = `state ${state.version.status}`;
  $('definition-summary').textContent = `Version ${definition.metadata.version} · ${definition.profile} · ${shortId(state.version.id)} · ${formatDate(state.version.created_at)}`;
  $('record-id').value = definition.primary_record.id;
  $('record-label').value = definition.primary_record.label;
  $('assumptions').value = definition.assumptions.join('\n');
  $('open-questions').value = definition.open_questions.join('\n');
  renderRoleEditor();
  renderFieldEditor();
  renderPageEditor();
  renderWorkflow();
  $('approve-definition').disabled = state.version.status === 'approved';
  $('approve-definition').textContent = state.version.status === 'approved'
    ? 'Application definition approved'
    : 'Approve application definition';
  $('create-plan').classList.toggle('hidden', state.version.status !== 'approved' || Boolean(state.plan));
  $('create-plan').disabled = false;
  $('create-plan').textContent = 'Create build plan';
  setError('definition', null);
}

function captureDefinitionText() {
  state.workingDefinition.primary_record.id = $('record-id').value.trim();
  state.workingDefinition.primary_record.label = $('record-label').value.trim();
  state.workingDefinition.assumptions = $('assumptions').value.split('\n').map((value) => value.trim()).filter(Boolean);
  state.workingDefinition.open_questions = $('open-questions').value.split('\n').map((value) => value.trim()).filter(Boolean);
}

function validateWorkingDefinition() {
  captureDefinitionText();
  const definition = state.workingDefinition;
  const idPattern = /^[a-z][a-z0-9_]{1,62}$/;
  const safeText = (value, maxLength = PROFILE.maxLabelLength) => (
    typeof value === 'string'
    && value.trim()
    && value.length <= maxLength
    && !/[<>\r\n]/.test(value)
  );
  const allIdentifiers = [
    ...definition.roles.map((role) => role.id),
    definition.primary_record.id,
    ...definition.primary_record.fields.map((field) => field.id),
  ];
  if (allIdentifiers.some((identifier) => RESERVED_IDENTIFIERS.has(identifier))) return 'Identifiers cannot use reserved names.';
  if (definition.roles.length < 2 || definition.roles.length > PROFILE.maxRoles) return 'Use between two and five roles.';
  if (definition.roles.some((role) => !PROFILE.roleKinds.includes(role.kind))) return 'Every role must use a supported responsibility.';
  if (definition.roles.filter((role) => role.kind === 'submitter').length !== 1) return 'Use exactly one submitter role.';
  if (definition.roles.filter((role) => role.kind === 'approver').length !== 1) return 'Use exactly one approver role.';
  if (new Set(definition.roles.map((role) => role.id)).size !== definition.roles.length) return 'Role IDs must be unique.';
  if (definition.roles.some((role) => !idPattern.test(role.id) || !safeText(role.label))) return 'Every role needs a valid ID and plain-text label.';
  if (!idPattern.test(definition.primary_record.id) || !safeText(definition.primary_record.label)) return 'The primary record needs a valid ID and plain-text label.';
  const fields = definition.primary_record.fields;
  if (!fields.length || fields.length > PROFILE.maxFields) return 'Use between one and eight fields.';
  if (fields.some((field) => !PROFILE.fieldTypes.includes(field.type))) return 'Every field must use a supported type.';
  if (new Set(fields.map((field) => field.id)).size !== fields.length) return 'Field IDs must be unique.';
  if (fields.some((field) => !idPattern.test(field.id) || !safeText(field.label))) return 'Every field needs a valid ID and plain-text label.';
  if (fields.some((field) => field.type === 'enum' && (
    !field.options?.length
    || field.options.length > PROFILE.maxOptions
    || new Set(field.options).size !== field.options.length
    || field.options.some((option) => !safeText(option))
  ))) return 'Every enum field needs one to twelve unique plain-text options.';
  const expectedPageKinds = {
    submit: 'form',
    my_records: 'list',
    approval_queue: 'queue',
    audit: 'audit',
  };
  if (
    definition.pages.length !== 4
    || Object.keys(expectedPageKinds).some((id) => !definition.pages.some((page) => page.id === id && page.kind === expectedPageKinds[id]))
  ) return 'The Golden profile requires its four fixed page responsibilities.';
  if (definition.pages.some((page) => !safeText(page.label))) return 'Every page needs a plain-text label.';
  if (definition.assumptions.length > PROFILE.maxStatements || definition.open_questions.length > PROFILE.maxStatements) {
    return 'Use no more than twelve assumptions and twelve open questions.';
  }
  const expectedCoverage = {
    submit: ['submitter'],
    my_records: ['submitter'],
    approval_queue: ['approver'],
    audit: expectedAuditActorKinds(definition),
  };
  if (definition.pages.some((page) => JSON.stringify(page.actor_kinds) !== JSON.stringify(expectedCoverage[page.id]))) {
    return 'Page actor coverage must match the selected role responsibilities.';
  }
  const expectedWorkflow = {
    id: 'approval',
    states: ['draft', 'submitted', 'approved', 'rejected'],
    transitions: [
      { from: 'draft', to: 'submitted', action: 'submit', actor_kind: 'submitter' },
      { from: 'submitted', to: 'approved', action: 'approve', actor_kind: 'approver' },
      { from: 'submitted', to: 'rejected', action: 'reject', actor_kind: 'approver' },
    ],
  };
  if (!structurallyEqual(definition.workflow, expectedWorkflow)) return 'The Golden approval lifecycle cannot be changed.';
  const definitionText = [
    ...definition.roles.map((role) => role.label),
    definition.primary_record.label,
    ...fields.flatMap((field) => [field.label, ...(field.options || [])]),
    ...definition.pages.map((page) => page.label),
    ...definition.assumptions,
    ...definition.open_questions,
  ];
  if (definitionText.some((value) => CREDENTIAL_ASSIGNMENT.test(value))) return 'Definition text cannot contain credential assignments.';
  if ([...definition.assumptions, ...definition.open_questions].some((value) => !safeText(value, 300))) return 'Assumptions and questions must be plain text under 300 characters.';
  return null;
}

function addDefinitionDetail(parent, term, value) {
  parent.append(element('dt', '', term), element('dd', '', value ?? '—'));
}

function renderPlan() {
  const plan = state.plan;
  if (!plan) {
    clear($('component-list'));
    clear($('artifact-checklist'));
    clear($('plan-identity'));
    return;
  }
  $('plan-status').textContent = plan.status === 'approved' ? 'Approved' : 'Pending approval';
  $('plan-status').className = `state ${plan.status === 'approved' ? 'approved' : 'pending'}`;
  $('profile-limit').textContent = plan.known_profile_limit;
  const components = clear($('component-list'));
  for (const component of plan.components) {
    const card = element('article', 'component-card');
    const heading = element('div', 'component-heading');
    const title = element('div');
    title.append(element('h3', '', component.key), element('p', '', component.category));
    const badges = element('div', 'badge-row');
    badges.append(
      element('span', 'status-chip golden', component.trust_level || 'golden'),
      element('span', 'status-chip', component.version || 'Version unavailable'),
    );
    heading.append(title, badges);
    card.append(heading, element('p', 'selection-reason', component.selected_for || 'Selected by the approved Golden profile.'));
    const details = element('dl', 'component-details');
    addDefinitionDetail(details, 'Digest', component.artifact_digest || 'Unavailable');
    addDefinitionDetail(details, 'Requires', component.requires?.length ? component.requires.join(', ') : 'No component dependencies');
    addDefinitionDetail(details, 'Record ID', component.inputs?.primary_record?.id || 'Unavailable');
    addDefinitionDetail(details, 'Record label', component.inputs?.primary_record?.label || 'Unavailable');
    addDefinitionDetail(details, 'Fields', component.inputs?.primary_record?.field_ids?.join(', ') || 'Unavailable');
    addDefinitionDetail(details, 'Roles', component.inputs?.roles?.join(', ') || 'Unavailable');
    addDefinitionDetail(details, 'Pages', component.inputs?.pages?.join(', ') || 'Unavailable');
    addDefinitionDetail(details, 'Workflow', component.inputs?.workflow || 'Unavailable');
    card.append(details);
    components.append(card);
  }
  const checklist = clear($('artifact-checklist'));
  for (const artifact of plan.artifact_checklist) checklist.append(element('li', '', artifact));
  const identity = clear($('plan-identity'));
  addDefinitionDetail(identity, 'Plan', shortId(plan.id));
  addDefinitionDetail(identity, 'Checksum', plan.checksum);
  addDefinitionDetail(identity, 'Created', formatDate(plan.created_at));
  $('approve-plan').disabled = plan.status === 'approved';
  $('approve-plan').textContent = plan.status === 'approved' ? 'Build plan approved' : 'Approve build plan';
  setError('plan', null);
}

function runsForSelectedPlan() {
  if (!state.project || !state.plan) return [];
  return state.project.runs.filter((run) => run.plan_id === state.plan.id);
}

function selectRun(runId) {
  const run = runsForSelectedPlan().find((candidate) => candidate.id === runId);
  if (!run) return;
  state.pollGeneration += 1;
  state.run = run;
  renderRun();
  refreshRun(run.id, true);
}

function renderRunHistory() {
  const runs = runsForSelectedPlan();
  const section = $('run-history-section');
  const history = clear($('run-history'));
  section.classList.toggle('hidden', !runs.length);
  runs.forEach((run, index) => {
    const button = element('button', `run-item${state.run?.id === run.id ? ' is-selected' : ''}`);
    button.type = 'button';
    const heading = element('span', 'run-row');
    heading.append(
      element('strong', '', `Run ${index + 1}`),
      element('span', `status-chip ${run.status}`, run.status.replaceAll('_', ' ')),
    );
    button.append(
      heading,
      element('span', 'lineage', `${shortId(run.id)} · ${formatDate(run.created_at)}`),
    );
    button.addEventListener('click', () => selectRun(run.id));
    history.append(button);
  });
}

function runPresentation(run) {
  if (!run) return { title: 'Not queued', kind: 'muted', message: 'Approve the build plan, then queue an isolated local build.' };
  if (run.phase === 'stopping') return { title: 'Stopping preview', kind: 'warning', message: 'The stop request is immutable. Waiting for the Executor to confirm teardown.' };
  if (run.status === 'failed') return { title: 'Build failed', kind: 'error', message: run.smoke?.summary || 'The Executor cleaned up the unsuccessful preview.' };
  if (run.status === 'stopped' && run.stop_reason === 'expired') return { title: 'Preview expired', kind: 'warning', message: 'The 30-minute local preview lifetime ended and its resources were torn down.' };
  if (run.status === 'stopped') return { title: 'Stopped by request', kind: 'muted', message: 'The local preview and its isolated resources were torn down.' };
  if (run.status === 'ready') return { title: 'Preview ready', kind: 'success', message: 'Smoke evidence passed. The preview is available only on this computer.' };
  if (run.status === 'smoke_testing') return { title: 'Smoke test running', kind: 'info', message: 'The Executor is validating submit, approve, and audit behavior.' };
  if (run.status === 'building') return { title: 'Build in progress', kind: 'info', message: 'The separate local Executor is building approved repository-owned artifacts.' };
  return { title: 'Build queued', kind: 'info', message: 'Waiting for the separate local Executor to claim the immutable request.' };
}

function renderRun() {
  const run = state.run;
  const planRuns = runsForSelectedPlan();
  const hasActiveRun = planRuns.some((candidate) => !TERMINAL_RUN_STATES.has(candidate.status));
  const canQueue = state.plan?.status === 'approved' && !hasActiveRun && (!run || TERMINAL_RUN_STATES.has(run.status));
  renderRunHistory();
  $('queue-build').classList.toggle('hidden', !canQueue);
  $('queue-build').disabled = !canQueue;
  $('queue-build').textContent = planRuns.length ? 'Queue another local build' : 'Queue local build';
  $('build-empty').classList.toggle('hidden', Boolean(run));
  $('run-content').classList.toggle('hidden', !run);
  const previewReady = run?.status === 'ready' && run.phase === 'ready';
  $('open-preview').classList.toggle('hidden', !run);
  $('open-preview').disabled = !previewReady;
  $('stop-preview').classList.toggle('hidden', !run || !ACTIVE_RUN_STATES.has(run.status) || run.phase === 'stopping');
  if (!run) {
    $('run-status').textContent = 'Not queued';
    $('run-status').className = 'state muted';
    updateEvidence();
    return;
  }
  const presentation = runPresentation(run);
  const summary = state.projects.find((project) => project.id === state.project?.id);
  if (summary) summary.latest_run_status = run.status;
  $('run-status').textContent = run.status.replaceAll('_', ' ');
  $('run-status').className = `state ${presentation.kind}`;
  const banner = clear($('run-banner'));
  banner.className = `run-banner ${presentation.kind}`;
  banner.append(element('strong', '', presentation.title), element('span', '', presentation.message));
  $('run-phase').textContent = run.phase.replaceAll('_', ' ');
  $('run-elapsed').textContent = formatDuration(run.created_at, run.finished_at);
  $('executor-status').textContent = run.executor?.status || 'unknown';
  $('smoke-status').textContent = run.smoke?.status || 'pending';
  const warning = $('executor-warning');
  const executorOffline = !TERMINAL_RUN_STATES.has(run.status) && run.executor?.status === 'offline';
  warning.classList.toggle('hidden', !executorOffline);
  warning.textContent = executorOffline
    ? `Executor offline — ${run.executor.message || 'start the separate local worker to continue this build.'}`
    : '';
  const logs = clear($('run-logs'));
  if (run.log_excerpt.length) {
    for (const line of run.log_excerpt) logs.append(element('li', '', line));
  } else {
    logs.append(element('li', 'muted-line', 'No Executor log evidence yet.'));
  }
  const artifacts = clear($('run-artifacts'));
  if (run.artifacts.length) {
    for (const artifact of run.artifacts) {
      const row = element('div', 'artifact-row');
      const text = element('div');
      text.append(element('strong', '', artifact.path), element('span', '', `${artifact.kind} · ${artifact.sha256.slice(0, 18)}…`));
      const download = element('button', 'text-button', `Download ${artifact.path}`);
      download.type = 'button';
      download.addEventListener('click', () => downloadArtifact(artifact));
      row.append(text, download);
      artifacts.append(row);
    }
  } else {
    artifacts.append(element('p', 'sidebar-empty', 'No artifacts published yet.'));
  }
  updateEvidence();
}

async function refreshRun(runId, scheduleNext) {
  const generation = ++state.pollGeneration;
  try {
    const { run } = await request(`/runs/${runId}`);
    if (!state.run || state.run.id !== runId) return;
    state.run = run;
    const index = state.project.runs.findIndex((candidate) => candidate.id === run.id);
    if (index >= 0) state.project.runs[index] = run;
    renderRun();
    renderProjects();
    if (scheduleNext && !TERMINAL_RUN_STATES.has(run.status)) {
      window.setTimeout(() => {
        if (generation === state.pollGeneration) refreshRun(runId, true);
      }, POLL_INTERVAL_MS);
    }
  } catch (error) {
    setError('build', error);
    if (scheduleNext && state.run?.id === runId && !TERMINAL_RUN_STATES.has(state.run.status)) {
      window.setTimeout(() => refreshRun(runId, true), POLL_INTERVAL_MS);
    }
  }
}

async function downloadArtifact(artifact) {
  try {
    setError('build', null);
    const token = $('capability-token').value;
    if (!token) throw new Error('Enter the local session capability to download an artifact.');
    const response = await fetch(`${API}${artifact.url.replace(/^\/api/, '')}`, {
      headers: { 'X-Factory-Capability': token },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw body;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = artifact.path.split('/').at(-1);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    setError('build', error);
  }
}

$('project-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setError('brief', null);
  const button = $('generate-definition');
  if (!$('capability-token').value) {
    setError('brief', new Error('Enter the local session capability before generating a definition.'));
    return;
  }
  button.disabled = true;
  button.textContent = 'Generating structured definition…';
  try {
    const response = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: $('project-name').value.trim(),
        brief: $('requirement-brief').value.trim(),
      }),
    });
    state.projects.push({
      id: response.project.id,
      name: response.project.name,
      created_at: response.project.created_at,
      latest_version_id: response.version.id,
      latest_version_status: response.version.status,
      latest_run_status: null,
    });
    await loadProject(response.project.id, response.version.id);
    setNotice('The model result passed the bounded approval-app schema. Review and edit it before approval.', 'success');
  } catch (error) {
    setError('brief', error);
  } finally {
    button.disabled = false;
    button.textContent = 'Generate application definition';
  }
});

$('new-project').addEventListener('click', () => {
  state.pollGeneration += 1;
  setNotice('', 'info');
  setStage('brief');
  $('project-name').focus();
});

document.querySelectorAll('[data-stage-target]').forEach((button) => {
  button.addEventListener('click', () => setStage(button.dataset.stageTarget));
});

$('record-id').addEventListener('input', () => {
  if (state.workingDefinition) state.workingDefinition.primary_record.id = $('record-id').value;
});

$('record-label').addEventListener('input', () => {
  if (state.workingDefinition) state.workingDefinition.primary_record.label = $('record-label').value;
});

$('add-role').addEventListener('click', () => {
  const roles = state.workingDefinition.roles;
  if (roles.length >= PROFILE.maxRoles) return;
  let suffix = roles.length + 1;
  while (roles.some((role) => role.id === `observer_${suffix}`)) suffix += 1;
  roles.push({ id: `observer_${suffix}`, label: `Observer ${suffix}`, kind: 'observer' });
  synchronizeAuditCoverage();
  renderRoleEditor();
  renderPageEditor();
});

$('add-field').addEventListener('click', () => {
  const fields = state.workingDefinition.primary_record.fields;
  if (fields.length >= PROFILE.maxFields) return;
  let suffix = fields.length + 1;
  while (fields.some((field) => field.id === `field_${suffix}`)) suffix += 1;
  fields.push({ id: `field_${suffix}`, label: `Field ${suffix}`, type: 'string', required: false });
  renderFieldEditor();
});

$('create-next-version').addEventListener('click', async () => {
  setError('definition', null);
  const validationError = validateWorkingDefinition();
  if (validationError) {
    setError('definition', new Error(validationError));
    return;
  }
  const button = $('create-next-version');
  button.disabled = true;
  try {
    const nextDefinition = clone(state.workingDefinition);
    const nextNumber = Math.max(...state.project.versions.map((version) => Number(version.definition.metadata.version))) + 1;
    nextDefinition.metadata.version = String(nextNumber);
    const { version } = await request(`/projects/${state.project.id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ base_version_id: state.version.id, definition: nextDefinition }),
    });
    await loadProject(state.project.id, version.id);
    setNotice(`Version ${version.definition.metadata.version} was created as an immutable child draft.`, 'success');
  } catch (error) {
    setError('definition', error);
  } finally {
    button.disabled = false;
  }
});

$('approve-definition').addEventListener('click', async () => {
  setError('definition', null);
  const validationError = validateWorkingDefinition();
  if (validationError) {
    setError('definition', new Error(validationError));
    return;
  }
  if (JSON.stringify(state.workingDefinition) !== JSON.stringify(state.version.definition)) {
    setError('definition', new Error('Create the next version before approving these unsaved edits.'));
    return;
  }
  const button = $('approve-definition');
  button.disabled = true;
  try {
    const approved = await request(`/versions/${state.version.id}/approve`, { method: 'POST', body: '{}' });
    state.version = approved.version;
    const versionIndex = state.project.versions.findIndex((version) => version.id === state.version.id);
    state.project.versions[versionIndex] = state.version;
    renderVersions();
    renderDefinition();
    updateEvidence();
    setNotice('Application definition approved. Create its immutable Golden build plan when ready.', 'success');
  } catch (error) {
    setError('definition', error);
    button.disabled = false;
  }
});

$('create-plan').addEventListener('click', async () => {
  setError('definition', null);
  const button = $('create-plan');
  button.disabled = true;
  try {
    const planned = await request(`/versions/${state.version.id}/plans`, { method: 'POST', body: '{}' });
    state.plan = planned.plan;
    const existingIndex = state.project.plans.findIndex((plan) => plan.id === state.plan.id);
    if (existingIndex >= 0) state.project.plans[existingIndex] = state.plan;
    else state.project.plans.push(state.plan);
    renderDefinition();
    renderPlan();
    updateEvidence();
    setStage('plan');
    setNotice('Build plan created. Review its immutable Golden component choices before approval.', 'success');
  } catch (error) {
    setError('definition', error);
    button.disabled = false;
    button.textContent = 'Retry build plan';
  }
});

$('approve-plan').addEventListener('click', async () => {
  setError('plan', null);
  const button = $('approve-plan');
  button.disabled = true;
  try {
    const { plan } = await request(`/plans/${state.plan.id}/approve`, { method: 'POST', body: '{}' });
    state.plan = plan;
    const index = state.project.plans.findIndex((candidate) => candidate.id === plan.id);
    state.project.plans[index] = plan;
    renderPlan();
    renderRun();
    updateEvidence();
    setStage('build');
    setNotice('Build plan approved. The immutable request can now be queued for the local Executor.', 'success');
  } catch (error) {
    setError('plan', error);
    button.disabled = false;
  }
});

$('queue-build').addEventListener('click', async () => {
  setError('build', null);
  const button = $('queue-build');
  button.disabled = true;
  try {
    const { run } = await request(`/plans/${state.plan.id}/runs`, { method: 'POST', body: '{}' });
    state.run = run;
    state.project.runs.push(run);
    renderRun();
    setNotice('Local build queued. Keep the separate Executor running while the workspace polls bounded status evidence.', 'success');
    refreshRun(run.id, true);
  } catch (error) {
    setError('build', error);
    button.disabled = false;
  }
});

$('open-preview').addEventListener('click', () => {
  if (state.run?.status === 'ready' && state.run.preview_url) {
    window.open(state.run.preview_url, '_blank', 'noopener');
  }
});

$('stop-preview').addEventListener('click', async () => {
  setError('build', null);
  const button = $('stop-preview');
  button.disabled = true;
  try {
    const { run } = await request(`/runs/${state.run.id}/stop`, { method: 'POST', body: '{}' });
    state.pollGeneration += 1;
    state.run = run;
    const index = state.project.runs.findIndex((candidate) => candidate.id === run.id);
    state.project.runs[index] = run;
    renderRun();
    refreshRun(run.id, true);
  } catch (error) {
    setError('build', error);
    button.disabled = false;
  }
});

renderProjects();
renderVersions();
loadProjects();
