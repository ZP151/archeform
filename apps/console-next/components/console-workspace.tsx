'use client';

import { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FactoryApi } from '@/lib/factory-api';
import type { Definition, Plan, Project, Run, Version } from '@/lib/types';

const stages = ['brief', 'definition', 'plan', 'build'] as const;
type Stage = typeof stages[number];

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'The local control plane did not return a usable response.';
}

function nextDefinition(version: Version, recordLabel: string): Definition {
  const definition = structuredClone(version.definition) as Definition;
  definition.metadata = { ...(definition.metadata || {}), version: String(Number(definition.metadata?.version || '0') + 1) };
  definition.primary_record = { ...(definition.primary_record || {}), label: recordLabel };
  return definition;
}

export function ConsoleWorkspace() {
  const api = useMemo(() => new FactoryApi(), []);
  const [capability, setCapability] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [stage, setStage] = useState<Stage>('brief');
  const [projectName, setProjectName] = useState('');
  const [brief, setBrief] = useState('');
  const [recordLabel, setRecordLabel] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [planRetry, setPlanRetry] = useState(false);

  const loadProject = async (id: string, chosenVersionId?: string) => {
    const result = await api.request<{ project: Project }>(`/projects/${id}`);
    setProject(result.project);
    setProjects((current) => [...current.filter((item) => item.id !== id), result.project]);
    const chosen = result.project.versions.find((item) => item.id === chosenVersionId) || result.project.versions.at(-1) || null;
    setVersion(chosen);
    setRecordLabel(chosen?.definition.primary_record?.label || '');
    const chosenPlan = chosen ? [...result.project.plans].reverse().find((item) => item.version_id === chosen.id) || null : null;
    setPlan(chosenPlan);
    const chosenRun = chosenPlan ? [...result.project.runs].reverse().find((item) => item.plan_id === chosenPlan.id) || null : null;
    setRun(chosenRun);
    setStage(chosenRun ? 'build' : chosenPlan ? 'plan' : chosen ? 'definition' : 'brief');
  };

  useEffect(() => {
    if (!capability) return;
    api.setCapability(capability);
    api.request<{ projects: Array<{ id: string }> }>('/projects')
      .then(({ projects: summaries }) => summaries[0] && loadProject(summaries[0].id))
      .catch((cause) => setError(messageFor(cause)));
  // The capability is the explicit connection boundary. The adapter instance is intentionally stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  useEffect(() => {
    if (!run || ['failed', 'stopped'].includes(run.status) || (run.status === 'ready' && run.phase !== 'stopping')) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.request<{ run: Run }>(`/runs/${run.id}`);
        setRun(result.run);
        setProject((current) => current ? { ...current, runs: current.runs.map((item) => item.id === result.run.id ? result.run : item) } : current);
      } catch (cause) { setError(messageFor(cause)); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [api, run]);

  const execute = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(messageFor(cause)); } finally { setBusy(false); }
  };

  const createProject = () => execute(async () => {
    if (!capability) throw new Error('Enter the local session capability before generating a definition.');
    const created = await api.request<{ project: Project; version: Version }>('/projects', { method: 'POST', body: JSON.stringify({ name: projectName.trim(), brief: brief.trim() }) });
    await loadProject(created.project.id, created.version.id);
    setNotice('The structured definition is ready for review and versioned approval.');
  });

  const createChild = () => execute(async () => {
    if (!project || !version) return;
    const created = await api.request<{ version: Version }>(`/projects/${project.id}/versions`, { method: 'POST', body: JSON.stringify({ base_version_id: version.id, definition: nextDefinition(version, recordLabel) }) });
    await loadProject(project.id, created.version.id);
    setNotice(`Version ${created.version.definition.metadata?.version || ''} was created as an immutable child draft.`);
  });

  const approveDefinition = () => execute(async () => {
    if (!version || recordLabel !== (version.definition.primary_record?.label || '')) throw new Error('Create the next version before approving unsaved edits.');
    const result = await api.request<{ version: Version }>(`/versions/${version.id}/approve`, { method: 'POST', body: '{}' });
    setVersion(result.version); setProject((current) => current ? { ...current, versions: current.versions.map((item) => item.id === result.version.id ? result.version : item) } : current);
    setNotice('Application definition approved. Create its immutable Golden build plan.');
  });

  const createPlan = () => execute(async () => {
    if (!version) return;
    try {
      const result = await api.request<{ plan: Plan }>(`/versions/${version.id}/plans`, { method: 'POST', body: '{}' });
      setPlan(result.plan); setPlanRetry(false); setStage('plan'); setNotice('Build plan created from Golden component packages.');
    } catch (cause) { setPlanRetry(true); throw cause; }
  });

  const approvePlan = () => execute(async () => {
    if (!plan) return;
    const result = await api.request<{ plan: Plan }>(`/plans/${plan.id}/approve`, { method: 'POST', body: '{}' });
    setPlan(result.plan); setStage('build'); setNotice('Build plan approved and ready for the local Executor.');
  });

  const queueRun = () => execute(async () => {
    if (!plan) return;
    const result = await api.request<{ run: Run }>(`/plans/${plan.id}/runs`, { method: 'POST', body: '{}' });
    setRun(result.run); setProject((current) => current ? { ...current, runs: [...current.runs, result.run] } : current); setStage('build'); setNotice('Local build queued.');
  });

  const stopRun = () => execute(async () => {
    if (!run) return;
    const result = await api.request<{ run: Run }>(`/runs/${run.id}/stop`, { method: 'POST', body: '{}' });
    setRun(result.run); setNotice('Stopping preview. Waiting for the Executor to confirm teardown.');
  });

  const download = async (artifact: { path: string; url: string }) => execute(async () => {
    const blob = await api.artifact(artifact.url); const href = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = href; link.download = artifact.path.split('/').at(-1) || 'artifact.json'; link.click(); URL.revokeObjectURL(href);
  });

  return <TooltipProvider><main className="workspace">
    <header className="topbar"><strong>Factory <span>Pilot</span></strong><div><Badge variant="outline">local</Badge> Requirement-to-product workspace</div></header>
    <section className="hero"><p className="eyebrow">PRODUCT WORKSPACE</p><h1>Shape a requirement into<br /><span>a runnable product.</span></h1><p>Review a business definition, approve its Golden component plan, then build a controlled local preview with evidence.</p></section>
    <div role="status" aria-live="polite" className={notice ? 'notice' : 'visually-hidden'}>{notice}</div>
    <div role="alert" className={error ? 'error' : 'visually-hidden'}>{error}</div>
    <section className="connection-row">
      <Sheet><SheetTrigger asChild><Button variant="outline">Local connection</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Local connection</SheetTitle><SheetDescription>The capability remains in this browser memory only.</SheetDescription></SheetHeader><div className="form-stack"><Label htmlFor="capability">Local session capability</Label><Input id="capability" value={capability} onChange={(event) => setCapability(event.target.value)} type="password" autoComplete="off" /><SheetClose asChild><Button onClick={() => { api.setCapability(capability); setNotice('Local capability loaded for this session.'); }}>Use local capability</Button></SheetClose></div></SheetContent></Sheet>
      <Tooltip><TooltipTrigger asChild><span className="muted">Loopback control plane only</span></TooltipTrigger><TooltipContent>Console Next calls the existing Factory API.</TooltipContent></Tooltip>
    </section>
    <section className="lineage"><aside><h2>Product lineage</h2><Button variant="outline" onClick={() => { setProject(null); setVersion(null); setPlan(null); setRun(null); setStage('brief'); }}>New project</Button>{projects.length ? projects.map((item) => <Button key={item.id} variant="ghost" className="project-link" onClick={() => loadProject(item.id)}>{item.name}</Button>) : <p className="muted">No projects selected.</p>}<Separator /><h3>{project?.name || 'Project versions'}</h3>{project?.versions.slice().reverse().map((item) => <Button key={item.id} variant={version?.id === item.id ? 'secondary' : 'ghost'} className="project-link" onClick={() => { setVersion(item); setRecordLabel(item.definition.primary_record?.label || ''); setStage('definition'); }}>{`Version ${item.definition.metadata?.version || '—'} · ${item.status}`}</Button>)}</aside>
      <div className="stages"><Tabs value={stage} onValueChange={(value) => setStage(value as Stage)}><TabsList>{stages.map((item, index) => <TabsTrigger value={item} key={item} disabled={item === 'definition' && !version || item === 'plan' && !plan || item === 'build' && plan?.status !== 'approved'}>{`0${index + 1} ${item === 'brief' ? 'Brief' : item === 'definition' ? 'Application definition' : item === 'plan' ? 'Build plan' : 'Build & preview'}`}</TabsTrigger>)}</TabsList>
        <TabsContent value="brief"><Card><CardHeader><CardTitle role="heading" aria-level={2}>Describe an internal application</CardTitle><CardDescription>Generate a bounded, editable application definition from the supplied business requirement.</CardDescription></CardHeader><CardContent><div className="form-stack"><Label htmlFor="project-name">Project name</Label><Input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="leave-management" /><Label htmlFor="requirement-brief">Requirement brief</Label><Textarea id="requirement-brief" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Describe roles, records, approval rules, and audit expectations." /><Button disabled={busy} onClick={createProject}>Generate application definition</Button></div></CardContent></Card></TabsContent>
        <TabsContent value="definition"><Card><CardHeader><CardTitle role="heading" aria-level={2}>Application definition</CardTitle><CardDescription>Review the immutable version and create a child version for permitted changes.</CardDescription></CardHeader><CardContent>{version ? <div className="form-stack"><Label htmlFor="record-label">Primary record label</Label><Input id="record-label" value={recordLabel} onChange={(event) => setRecordLabel(event.target.value)} /><pre className="evidence">{JSON.stringify(version.definition, null, 2)}</pre><div className="actions"><Button disabled={busy || version.status !== 'draft'} onClick={createChild}>Create next version</Button><Button variant="secondary" disabled={busy || version.status !== 'draft'} onClick={approveDefinition}>Approve application definition</Button><Button variant="outline" disabled={busy || version.status !== 'approved'} onClick={createPlan}>{planRetry ? 'Retry build plan' : 'Create build plan'}</Button></div></div> : <Skeleton className="skeleton" />}</CardContent></Card></TabsContent>
        <TabsContent value="plan"><Card><CardHeader><CardTitle role="heading" aria-level={2}>Build plan</CardTitle><CardDescription>Only version-pinned Golden packages can enter this plan.</CardDescription></CardHeader><CardContent>{plan ? <><Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Version</TableHead><TableHead>Trust</TableHead></TableRow></TableHeader><TableBody>{plan.components?.map((component) => <TableRow key={component.key}><TableCell>{component.key}</TableCell><TableCell>{component.version}</TableCell><TableCell>{component.trust_level || 'golden'}</TableCell></TableRow>)}</TableBody></Table><Button disabled={busy || plan.status !== 'draft'} onClick={approvePlan}>Approve build plan</Button></> : <p className="muted">Create and approve an application definition before planning.</p>}</CardContent></Card></TabsContent>
        <TabsContent value="build"><Card><CardHeader><CardTitle role="heading" aria-level={2}>Build & preview</CardTitle><CardDescription>A separate local Executor builds the approved application and exposes loopback preview evidence.</CardDescription></CardHeader><CardContent>{run ? <><p><Badge>{run.status}</Badge> {run.executor?.status === 'offline' ? 'Executor offline — Start the local Executor.' : run.phase || 'Queued'}</p><div className="actions"><Button disabled={busy || !plan} onClick={queueRun}>{run.status === 'stopped' || run.status === 'failed' ? 'Queue another local build' : 'Queue local build'}</Button><Button variant="outline" disabled={run.status !== 'ready' || !run.preview_url} onClick={() => run.preview_url && window.open(run.preview_url, '_blank', 'noopener')}>Open preview</Button><Dialog><DialogTrigger asChild><Button variant="destructive" disabled={run.status !== 'ready'}>Stop preview</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Stop preview?</DialogTitle><DialogDescription>The request is immutable. The local Executor confirms teardown separately.</DialogDescription></DialogHeader><DialogFooter><Button variant="destructive" onClick={stopRun}>Confirm stop preview</Button></DialogFooter></DialogContent></Dialog></div>{run.artifacts?.map((artifact) => <Button key={artifact.id} variant="link" onClick={() => download(artifact)}>Download {artifact.path}</Button>)}<Accordion type="single" collapsible><AccordionItem value="diagnostics"><AccordionTrigger>Bounded log and diagnostics</AccordionTrigger><AccordionContent><pre className="evidence">{JSON.stringify(run, null, 2)}</pre></AccordionContent></AccordionItem></Accordion></> : <Button disabled={busy || plan?.status !== 'approved'} onClick={queueRun}>Queue local build</Button>}</CardContent></Card></TabsContent>
      </Tabs></div>
    </section>
  </main></TooltipProvider>;
}
