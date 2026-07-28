'use client';

import { ArrowUpRight, Boxes, ClipboardCheck, Download, FilePlus2, FileText, FolderKanban, GitBranch, ListTree, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FactoryAction, FactoryAppShell, FactoryBadge, FactoryCommandTrigger, FactoryEmptyState, FactoryIconAction, FactoryInput, FactoryLabel, FactoryNotice, FactoryPanel, FactorySheet, FactoryStageRail, FactoryStatus, FactoryTextarea, FactoryThemeControl } from '@/components/factory-ui/factory-ui';
import { LineageDag } from '@/components/factory-ui/lineage-dag';
import { DefinitionEditor, validateDefinition } from '@/components/definition-editor';
import { FactoryApi, FactoryApiError } from '@/lib/factory-api';
import type { Definition, Plan, Project, Run, Version } from '@/lib/types';

const stages = ['brief', 'definition', 'plan', 'build'] as const;
type Stage = typeof stages[number];
type ProjectSummary = Pick<Project, 'id' | 'name'>;
type Operation = 'idle' | 'create-definition' | 'create-version' | 'approve-definition' | 'create-plan' | 'approve-plan' | 'queue-run' | 'stop-run' | 'download-evidence';
type HydrationState = 'loading' | 'ready' | 'failed';
const stageLabels: Record<Stage, string> = { brief: 'Brief', definition: 'Application definition', plan: 'Component plan', build: 'Build run' };
const operationLabel: Record<Exclude<Operation, 'idle'>, string> = {
  'create-definition': 'Creating definition',
  'create-version': 'Creating version',
  'approve-definition': 'Approving definition',
  'create-plan': 'Creating component plan',
  'approve-plan': 'Approving component plan',
  'queue-run': 'Queueing build',
  'stop-run': 'Requesting stop',
  'download-evidence': 'Downloading evidence',
};
const briefPresets = [
  { label: 'Approval flow', icon: ClipboardCheck, text: 'Employees submit a request, a manager approves or rejects it, and each decision is retained in an audit log.' },
  { label: 'Audited record', icon: ShieldCheck, text: 'Create a role-aware internal record with an approval decision, traceable history, and an audit view.' },
  { label: 'Request intake', icon: FileText, text: 'Users submit structured requests, reviewers process a queue, and administrators can inspect every outcome.' },
] as const;
const planGroups = [
  { id: 'interface', label: 'Interface', match: (key: string) => key.startsWith('ui.') },
  { id: 'services', label: 'Services', match: (key: string) => key.startsWith('backend.') },
  { id: 'runtime', label: 'Runtime', match: (key: string) => key.startsWith('data.') },
  { id: 'workflow', label: 'Workflow', match: (key: string) => key.startsWith('workflow.') },
  { id: 'controls', label: 'Controls', match: (key: string) => key.startsWith('ops.') },
] as const;

function messageFor(error: unknown) { return error instanceof Error ? error.message : 'The Factory service did not return a usable response.'; }
function nextDefinition(version: Version, draft: Definition): Definition { const definition = structuredClone(draft); definition.metadata = { ...definition.metadata, version: String(Number(version.definition.metadata.version || '0') + 1) }; return definition; }
function tone(status?: string): 'neutral' | 'good' | 'warning' | 'danger' { if (status === 'approved' || status === 'ready') return 'good'; if (status === 'failed') return 'danger'; if (status === 'draft' || status === 'queued') return 'warning'; return 'neutral'; }

export function ConsoleWorkspace() {
  const api = useMemo(() => new FactoryApi(), []);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [stage, setStage] = useState<Stage>('brief');
  const [projectName, setProjectName] = useState('');
  const [brief, setBrief] = useState('');
  const [definitionDraft, setDefinitionDraft] = useState<Definition | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [operation, setOperation] = useState<Operation>('idle');
  const operationRef = useRef<Exclude<Operation, 'idle'> | null>(null);
  const [hydrationState, setHydrationState] = useState<HydrationState>('loading');
  const [runPollError, setRunPollError] = useState('');
  const hasLocalBriefInput = useRef(false);
  const [planRetry, setPlanRetry] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectsRestoreFocusId, setProjectsRestoreFocusId] = useState('open-products-trigger');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const loadProject = async (id: string, chosenVersionId?: string, protectLocalBrief = false) => {
    const result = await api.request<{ project: Project }>(`/projects/${id}`);
    if (protectLocalBrief && hasLocalBriefInput.current) return false;
    setProject(result.project);
    setProjects((current) => [...current.filter((item) => item.id !== id), { id: result.project.id, name: result.project.name }]);
    const chosen = result.project.versions.find((item) => item.id === chosenVersionId) || result.project.versions.at(-1) || null;
    setVersion(chosen); setDefinitionDraft(chosen ? structuredClone(chosen.definition) : null);
    const selectedPlan = chosen ? [...result.project.plans].reverse().find((item) => item.version_id === chosen.id) || null : null;
    setPlan(selectedPlan);
    const selectedRun = selectedPlan ? [...result.project.runs].reverse().find((item) => item.plan_id === selectedPlan.id) || null : null;
    setRun(selectedRun); setStage(selectedRun ? 'build' : selectedPlan ? 'plan' : chosen ? 'definition' : 'brief');
    return true;
  };

  const hydrateProjects = async () => {
    setHydrationState('loading'); setError('');
    try {
      const { projects: summaries } = await api.request<{ projects: ProjectSummary[] }>('/projects');
      setProjects(summaries);
      if (!hasLocalBriefInput.current && summaries[0]) await loadProject(summaries[0].id, undefined, true);
      setHydrationState('ready');
    } catch (cause) {
      setHydrationState('failed'); setError(messageFor(cause));
    }
  };
  const refreshRunStatus = async () => {
    if (!run) return;
    setRunPollError('');
    try {
      const result = await api.request<{ run: Run }>(`/runs/${run.id}`);
      setRun(result.run);
    } catch (cause) {
      setRunPollError(messageFor(cause));
    }
  };

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { void hydrateProjects(); }, [api]);
  useEffect(() => {
    if (!run || runPollError || ['failed', 'stopped'].includes(run.status) || (run.status === 'ready' && run.phase !== 'stopping')) return;
    const timer = window.setTimeout(() => { void refreshRunStatus(); }, 650);
    return () => window.clearTimeout(timer);
  }, [api, run, runPollError]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => { if (commandOpen) { setCommandQuery(''); setCommandIndex(0); } }, [commandOpen]);

  const runMutation = async (nextOperation: Exclude<Operation, 'idle'>, action: () => Promise<void>) => {
    if (operationRef.current) return;
    operationRef.current = nextOperation; setOperation(nextOperation); setError('');
    try { await action(); } catch (cause) { setError(messageFor(cause)); } finally {
      if (operationRef.current === nextOperation) { operationRef.current = null; setOperation('idle'); }
    }
  };
  const resetProject = () => { hasLocalBriefInput.current = false; setProject(null); setVersion(null); setDefinitionDraft(null); setPlan(null); setRun(null); setRunPollError(''); setStage('brief'); setProjectName(''); setBrief(''); setError(''); setProjectsOpen(false); };
  const createProject = () => runMutation('create-definition', async () => { const created = await api.request<{ project: Project; version: Version }>('/projects', { method: 'POST', body: JSON.stringify({ name: projectName.trim(), brief: brief.trim() }) }); await loadProject(created.project.id, created.version.id); setNotice('Application definition is ready for review.'); });
  const createChild = () => runMutation('create-version', async () => { if (!project || !version || !definitionDraft) return; const validationError = validateDefinition(definitionDraft); if (validationError) throw new Error(validationError); const created = await api.request<{ version: Version }>(`/projects/${project.id}/versions`, { method: 'POST', body: JSON.stringify({ base_version_id: version.id, definition: nextDefinition(version, definitionDraft) }) }); await loadProject(project.id, created.version.id); setNotice(`Version ${created.version.definition.metadata.version || ''} is now an immutable draft.`); });
  const approveDefinition = () => runMutation('approve-definition', async () => { if (!version || !definitionDraft) throw new Error('Select an application definition first.'); const validationError = validateDefinition(definitionDraft); if (validationError) throw new Error(validationError); if (JSON.stringify(definitionDraft) !== JSON.stringify(version.definition)) throw new Error('Create the next version before approving unsaved edits.'); const result = await api.request<{ version: Version }>(`/versions/${version.id}/approve`, { method: 'POST', body: '{}' }); setVersion(result.version); setNotice('Definition approved. Component planning is now available.'); });
  const createPlan = () => runMutation('create-plan', async () => { if (!version) return; try { const result = await api.request<{ plan: Plan }>(`/versions/${version.id}/plans`, { method: 'POST', body: '{}' }); setPlan(result.plan); setPlanRetry(false); setStage('plan'); setNotice('Component plan created from approved packages.'); } catch (cause) { setPlanRetry(true); throw cause; } });
  const approvePlan = () => runMutation('approve-plan', async () => { if (!plan) return; const result = await api.request<{ plan: Plan }>(`/plans/${plan.id}/approve`, { method: 'POST', body: '{}' }); setPlan(result.plan); setStage('build'); setNotice('Component plan approved and ready for a build run.'); });
  const queueRun = () => runMutation('queue-run', async () => {
    if (!plan) return;
    try {
      const result = await api.request<{ run: Run }>(`/plans/${plan.id}/runs`, { method: 'POST', body: '{}' });
      setRun(result.run); setStage('build'); setNotice('Build run queued. Evidence is available from the build evidence sheet.');
    } catch (cause) {
      if (cause instanceof FactoryApiError && cause.code === 'component_plan_incompatible') {
        setStage('definition');
        setNotice('Approved component assets changed. Create a revision before planning and building again.');
        throw new Error('component_plan_incompatible: Create a revision for this definition, approve it, then create a new component plan.');
      }
      throw cause;
    }
  });
  const stopRun = () => runMutation('stop-run', async () => { if (!run) return; const result = await api.request<{ run: Run }>(`/runs/${run.id}/stop`, { method: 'POST', body: '{}' }); setRun(result.run); setConfirmStop(false); setNotice('Stop requested. Waiting for teardown evidence.'); });
  const download = async (artifact: { path: string; url: string }) => runMutation('download-evidence', async () => { const blob = await api.artifact(artifact.url); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = artifact.path.split('/').at(-1) || 'artifact.json'; link.click(); URL.revokeObjectURL(href); });
  const openProducts = (restoreFocusId: string) => { setProjectsRestoreFocusId(restoreFocusId); setProjectsOpen(true); };
  const setBriefInput = (value: string) => { hasLocalBriefInput.current = true; setBrief(value); };
  const setProjectNameInput = (value: string) => { hasLocalBriefInput.current = true; setProjectName(value); };
  const applyBriefPreset = (text: string) => setBriefInput(text);
  const mutationActive = operation !== 'idle';
  const activeOperationLabel = operation === 'idle' ? '' : operationLabel[operation];
  const activeRun = Boolean(run && ['queued', 'running', 'stopping'].includes(run.phase || run.status));
  const mayQueueRun = Boolean(plan?.status === 'approved') && !mutationActive && (!run || ['failed', 'stopped'].includes(run.status)) && !activeRun;
  const mayStopRun = Boolean(run?.status === 'ready' && run.preview_url) && !mutationActive;
  const mayChangeWorkspace = !mutationActive;
  const stageItems = stages.map((id) => ({ id, label: stageLabels[id], enabled: mayChangeWorkspace && (id === 'brief' || (id === 'definition' && Boolean(version)) || (id === 'plan' && Boolean(plan)) || (id === 'build' && plan?.status === 'approved')), state: id === 'definition' ? version?.status : id === 'plan' ? plan?.status : id === 'build' ? run?.status : undefined }));
  const commandItems = [
    { id: 'open-products', label: 'Open products', hint: 'Switch the controlled product context from the project rail', enabled: true, execute: () => openProducts('open-command-menu-trigger') },
    { id: 'new-product', label: 'New product', hint: 'Start a controlled application brief', enabled: mayChangeWorkspace, execute: resetProject },
    { id: 'open-lineage', label: 'Open product lineage', hint: 'Inspect the selected package graph', enabled: Boolean(project), execute: () => setLineageOpen(true) },
    { id: 'open-evidence', label: 'Open build evidence', hint: 'Inspect bounded artifacts and diagnostics', enabled: Boolean(run), execute: () => setEvidenceOpen(true) },
  ];
  const matchingCommands = commandItems.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(commandQuery.trim().toLowerCase()));
  const activeCommandIndex = matchingCommands.length ? Math.min(commandIndex, matchingCommands.length - 1) : -1;
  const activeCommandId = matchingCommands.length ? `command-option-${matchingCommands[activeCommandIndex].id}` : undefined;
  const runCommand = (item: typeof commandItems[number]) => { if (!item.enabled) return; item.execute(); setCommandOpen(false); };
  const handleCommandKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!matchingCommands.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setCommandIndex((index) => Math.min(index + 1, matchingCommands.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setCommandIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter') { event.preventDefault(); runCommand(matchingCommands[Math.min(commandIndex, matchingCommands.length - 1)]); }
  };

  return <FactoryAppShell>
    <aside className="console-icon-rail" data-factory-component="icon-rail" aria-label="Console navigation">
      <div className="console-mark" aria-label="Factory Pilot"><Boxes aria-hidden="true" size={19} /></div>
      <div className="console-icon-rail-main"><FactoryIconAction id="open-products-trigger" label="Open products" disabled={!mayChangeWorkspace} onClick={() => openProducts('open-products-trigger')}><FolderKanban aria-hidden="true" size={18} /></FactoryIconAction><FactoryIconAction label="New product" disabled={!mayChangeWorkspace} onClick={resetProject}><FilePlus2 aria-hidden="true" size={18} /></FactoryIconAction><FactoryIconAction id="open-lineage-trigger" label="Open product lineage" disabled={!project} onClick={() => setLineageOpen(true)}><GitBranch aria-hidden="true" size={18} /></FactoryIconAction></div>
    </aside>
    <div className="console-main">
      <header className="console-topbar" data-factory-console-ready={hydrated ? 'true' : 'false'}><button id="open-products-topbar-trigger" type="button" className="console-project-switcher" aria-label={project?.name || 'New product'} title={project?.name || 'New product'} disabled={!mayChangeWorkspace} onClick={() => openProducts('open-products-topbar-trigger')}>{project ? <><span>{project.name}</span><small>Version {version?.definition.metadata.version || '1'}</small></> : <><span>Factory Pilot</span><small>New product</small></>}</button><div className="console-topbar-actions"><FactoryCommandTrigger id="open-command-menu-trigger" onClick={() => setCommandOpen(true)} /><FactoryThemeControl /></div></header>
      <main className="console-workspace">
        <section className="workflow-canvas" data-factory-component="workflow-canvas">
          <header className="workspace-context"><div className="workspace-title"><span className="rail-kicker">Requirement to product</span><strong>{project?.name || 'New product'}</strong><span>v{version?.definition.metadata.version || '1'}</span></div><FactoryBadge>{mutationActive ? activeOperationLabel : run?.status || plan?.status || version?.status || 'Ready'}</FactoryBadge></header>
          <div role="status" aria-live="polite" className={notice || mutationActive ? 'notice-slot' : 'visually-hidden'}>{mutationActive ? <FactoryNotice>{activeOperationLabel}</FactoryNotice> : notice && <FactoryNotice>{notice}</FactoryNotice>}</div>
          <div role="alert" className={error ? 'error-slot' : 'visually-hidden'}>{error}</div>
          {hydrationState === 'failed' && <FactoryAction tone="neutral" onClick={() => void hydrateProjects()}>Retry initial load</FactoryAction>}
          <FactoryStageRail stages={stageItems} value={stage} onChange={(nextStage) => setStage(nextStage as Stage)} />
          <section className="active-stage-workspace" data-factory-component="active-stage-workspace">
            {stage === 'brief' && <section className="brief-workbench" aria-label="Create a product brief">
              <div className="brief-composer">
                <header className="brief-composer-head"><span className="canvas-mark"><Sparkles aria-hidden="true" size={17} /></span><div><span className="rail-kicker">01 / Brief</span><h1>Product outcome</h1></div><FactoryBadge>Draft</FactoryBadge></header>
                <div className="brief-form">
                  <div className="brief-name-row"><FactoryLabel htmlFor="project-name">Name</FactoryLabel><FactoryInput id="project-name" disabled={!mayChangeWorkspace} value={projectName} onChange={(event) => setProjectNameInput(event.target.value)} placeholder="expense-approval" /></div>
                  <div className="brief-editor"><FactoryLabel htmlFor="requirement-brief">Describe what should happen</FactoryLabel><FactoryTextarea id="requirement-brief" disabled={!mayChangeWorkspace} value={brief} onChange={(event) => setBriefInput(event.target.value)} placeholder="Employees submit expense claims. Managers approve them. Finance retains an audit trail." /><div className="brief-editor-footer"><FactoryAction disabled={!mayChangeWorkspace || !projectName.trim() || !brief.trim()} onClick={createProject}>Generate <ArrowUpRight aria-hidden="true" size={16} /></FactoryAction></div></div>
                </div>
                <footer className="brief-presets" aria-label="Brief starters">{briefPresets.map(({ label, icon: Icon, text }) => <button type="button" disabled={!mayChangeWorkspace} key={label} onClick={() => applyBriefPreset(text)}><Icon aria-hidden="true" size={16} /><span>{label}</span></button>)}</footer>
              </div>
            </section>}
            {stage === 'definition' && <FactoryPanel className="decision-canvas"><header className="canvas-heading"><div className="canvas-mark"><FileText aria-hidden="true" size={17} /></div><div><span className="rail-kicker">02 / Application definition</span><h1>Review the shape.</h1></div><FactoryBadge>{version?.status || 'loading'}</FactoryBadge></header>{version && definitionDraft ? <div className="definition-layout"><fieldset disabled={!mayChangeWorkspace} style={{ border: 0, margin: 0, minInlineSize: 0, padding: 0 }}><DefinitionEditor value={definitionDraft} onChange={setDefinitionDraft} /></fieldset><aside className="decision-panel"><h3>Definition gate</h3><dl><div><dt>Roles</dt><dd>{definitionDraft.roles.length}</dd></div><div><dt>Fields</dt><dd>{definitionDraft.primary_record.fields.length}</dd></div><div><dt>Pages</dt><dd>{definitionDraft.pages.length}</dd></div></dl><FactoryAction tone="neutral" disabled={!mayChangeWorkspace || !['draft', 'approved'].includes(version.status)} onClick={createChild}>{version.status === 'approved' ? 'Create revision for new components' : 'Create next version'}</FactoryAction><FactoryAction disabled={!mayChangeWorkspace || version.status !== 'draft'} onClick={approveDefinition}>Approve definition</FactoryAction><FactoryAction tone="neutral" disabled={!mayChangeWorkspace || version.status !== 'approved'} onClick={createPlan}>{planRetry ? 'Retry component plan' : 'Create component plan'}</FactoryAction></aside></div> : <FactoryEmptyState>Loading definition data.</FactoryEmptyState>}</FactoryPanel>}
            {stage === 'plan' && <FactoryPanel className="decision-canvas"><header className="canvas-heading"><div className="canvas-mark"><Boxes aria-hidden="true" size={17} /></div><div><span className="rail-kicker">03 / Component plan</span><h1>Inspect the assembly.</h1></div><FactoryBadge>{plan?.status || 'not created'}</FactoryBadge></header>{plan ? <><div className="component-plan-groups" aria-label="Approved component assets">{planGroups.map((group) => { const components = plan.components?.filter((component) => group.match(component.key)) || []; return components.length ? <section key={group.id}><header><span>{group.label}</span><small>{components.length}</small></header><ul>{components.map((component) => <li key={component.key} data-component-key={component.key}><span className="component-plan-dot" /><strong>{component.key}</strong><small>v{component.version}</small><FactoryBadge>{component.trust_level || 'golden'}</FactoryBadge></li>)}</ul></section> : null; })}</div><div className="canvas-actions"><FactoryAction disabled={!mayChangeWorkspace || !['draft', 'pending_approval'].includes(plan.status)} onClick={approvePlan}>Approve component plan <ArrowUpRight aria-hidden="true" size={16} /></FactoryAction></div></> : <FactoryEmptyState>Approve an application definition before creating a component plan.</FactoryEmptyState>}</FactoryPanel>}
            {stage === 'build' && <section className="build-workbench"><FactoryPanel className="execution-canvas"><header className="canvas-heading"><div className="canvas-mark"><Play aria-hidden="true" size={17} /></div><div><span className="rail-kicker">04 / Build run</span><h1>{run ? 'Execution workspace.' : 'Ready to build.'}</h1></div><div className="build-heading-actions">{run && <FactoryAction id="build-evidence-trigger" tone="neutral" aria-label={`Open build evidence, ${run.artifacts?.length ?? 0} artifacts`} onClick={() => setEvidenceOpen(true)}><ListTree aria-hidden="true" size={16} /> Evidence {run.artifacts?.length ?? 0}</FactoryAction>}<FactoryBadge>{run?.status || 'ready'}</FactoryBadge></div></header>{run ? <section><div className="run-grid"><FactoryStatus label="Phase" value={run.phase || 'queued'} tone={tone(run.status)} /><FactoryStatus label="Executor" value={run.executor?.status || 'waiting'} tone={tone(run.executor?.status)} /><FactoryStatus label="Preview" value={run.preview_url ? 'available' : 'pending'} tone={run.preview_url ? 'good' : 'warning'} /></div>{runPollError && <div className="run-recovery" role="status" aria-live="polite"><FactoryNotice>Run status could not be refreshed.</FactoryNotice><FactoryAction tone="neutral" onClick={() => void refreshRunStatus()}>Retry run status</FactoryAction></div>}<div className="build-actions"><FactoryAction disabled={!mayQueueRun} onClick={queueRun}>{run.status === 'stopped' || run.status === 'failed' ? 'Queue another build' : 'Queue build'}</FactoryAction><FactoryAction tone="neutral" disabled={mutationActive || run.status !== 'ready' || !run.preview_url} onClick={() => run.preview_url && window.open(run.preview_url, '_blank', 'noopener')}>Open preview</FactoryAction><FactoryAction id="stop-preview-trigger" tone="danger" disabled={!mayStopRun} onClick={() => setConfirmStop(true)}>Stop preview</FactoryAction></div></section> : <FactoryEmptyState><FactoryAction disabled={!mayQueueRun} onClick={queueRun}>Queue build <ArrowUpRight aria-hidden="true" size={16} /></FactoryAction></FactoryEmptyState>}</FactoryPanel></section>}
          </section>
        </section>
      </main>
    </div>
    <FactorySheet open={projectsOpen} onOpenChange={setProjectsOpen} restoreFocusId={projectsRestoreFocusId} side="left" title="Products" description="Switch between controlled product records."><div className="sheet-list"><FactoryAction tone="neutral" disabled={!mayChangeWorkspace} onClick={resetProject}>New product</FactoryAction>{projects.length ? projects.map((item) => <button type="button" disabled={!mayChangeWorkspace} className={item.id === project?.id ? 'sheet-row is-selected' : 'sheet-row'} key={item.id} onClick={() => { if (!mayChangeWorkspace) return; void loadProject(item.id).then(() => setProjectsOpen(false)).catch((cause) => setError(messageFor(cause))); }}><span>{item.name}</span><small>{item.id === project?.id ? 'Current' : 'Open'}</small></button>) : <p>No products have been created yet.</p>}{project?.versions.length ? <><span className="sheet-section-label">Versions</span>{project.versions.slice().reverse().map((item) => <button type="button" disabled={!mayChangeWorkspace} className={item.id === version?.id ? 'sheet-row is-selected' : 'sheet-row'} key={item.id} onClick={() => { if (!mayChangeWorkspace) return; void loadProject(project.id, item.id).then(() => setProjectsOpen(false)).catch((cause) => setError(messageFor(cause))); }}><span>Version {item.definition.metadata.version || '1'}</span><small>{item.status}</small></button>)}</> : null}</div></FactorySheet>
    <FactorySheet open={commandOpen} onOpenChange={setCommandOpen} initialFocusId="command-menu-search" side="center" title="Command menu" description="Search local console actions."><div className="command-menu"><FactoryInput id="command-menu-search" aria-label="Search commands" role="combobox" aria-autocomplete="list" aria-controls="command-menu-options" aria-activedescendant={activeCommandId} aria-expanded={commandOpen} value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} onKeyDown={handleCommandKeyDown} placeholder="Type a command…" /><div id="command-menu-options" className="command-menu-list" role="listbox" aria-label="Matching commands">{matchingCommands.length ? matchingCommands.map((item, index) => <button id={`command-option-${item.id}`} type="button" key={item.id} className="command-menu-item" data-active={index === activeCommandIndex ? 'true' : undefined} role="option" aria-selected={index === activeCommandIndex} disabled={!item.enabled} onMouseEnter={() => setCommandIndex(index)} onClick={() => runCommand(item)}><span>{item.label}</span><small>{item.hint}</small></button>) : <p className="command-menu-empty">No matching commands.</p>}</div></div></FactorySheet>
    <FactorySheet open={evidenceOpen} onOpenChange={setEvidenceOpen} restoreFocusId="build-evidence-trigger" title="Build evidence" description="Bounded artifacts and diagnostics from the selected run."><div className="sheet-list">{run?.artifacts?.length ? run.artifacts.map((artifact) => <div className="evidence-artifact-row" key={artifact.id}><span data-evidence-filename title={artifact.path}>{artifact.path.split('/').at(-1) || artifact.path}</span><FactoryIconAction data-evidence-artifact disabled={mutationActive} label={`Download ${artifact.path}`} onClick={() => download(artifact)}><Download aria-hidden="true" size={16} /></FactoryIconAction></div>) : <p>No artifact has been recorded yet.</p>}{run && <details><summary>Run diagnostics</summary><pre>{JSON.stringify({ id: run.id, status: run.status, phase: run.phase, executor: run.executor }, null, 2)}</pre></details>}</div></FactorySheet>
    <FactorySheet open={lineageOpen} onOpenChange={setLineageOpen} restoreFocusId="open-lineage-trigger" side="floating" modal overlay="clear" title="Product lineage" description="Read-only product-to-package graph.">{project && <LineageDag compact project={project} version={version} plan={plan} run={run} />}</FactorySheet>
    <FactorySheet open={confirmStop} onOpenChange={setConfirmStop} restoreFocusId="stop-preview-trigger" initialFocusId="cancel-stop-preview" side="center" title="Stop this preview?" description="The stop request is immutable. The Executor confirms teardown separately."><div className="sheet-list sheet-actions"><FactoryAction id="cancel-stop-preview" tone="neutral" disabled={mutationActive} onClick={() => setConfirmStop(false)}>Cancel stop</FactoryAction><FactoryAction tone="danger" disabled={!mayStopRun} onClick={stopRun}>Confirm stop</FactoryAction></div></FactorySheet>
  </FactoryAppShell>;
}
