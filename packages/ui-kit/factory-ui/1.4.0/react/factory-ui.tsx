'use client';

import { Command, Moon, Sun, X } from 'lucide-react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Dialog as DialogPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';

const VERSION = '1.4.0';
type ChildrenProps = { children: ReactNode };
type Tone = 'primary' | 'neutral' | 'danger' | 'quiet';

function classes(...values: Array<string | undefined>) { return values.filter(Boolean).join(' '); }

export function FactoryTheme({ children }: ChildrenProps) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="factory-console-theme" disableTransitionOnChange>{children}</ThemeProvider>;
}

export function FactoryTooltip({ label, children, side = 'bottom' }: ChildrenProps & { label: string; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return <TooltipPrimitive.Provider delayDuration={200}><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="factory-tooltip" side={side} sideOffset={8}>{label}<TooltipPrimitive.Arrow className="factory-tooltip-arrow" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>;
}

export function FactoryAction({ tone = 'primary', className, component = 'action', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; component?: 'action' | 'button' }) {
  return <button {...props} type={props.type ?? 'button'} className={classes('factory-action', className)} data-factory-ui={VERSION} data-factory-component={component} data-tone={tone} />;
}

export function FactoryButton({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'secondary' | 'danger' }) {
  const tone: Tone = variant === 'outline' ? 'neutral' : variant === 'secondary' ? 'quiet' : variant === 'danger' ? 'danger' : 'primary';
  return <FactoryAction {...props} tone={tone} component="button" />;
}

export function FactoryIconAction({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ChildrenProps & { label: string }) {
  return <FactoryTooltip label={label}><button {...props} type={props.type ?? 'button'} aria-label={label} className={classes('factory-icon-action', className)} data-factory-ui={VERSION} data-factory-component="icon-action">{children}</button></FactoryTooltip>;
}

export function FactoryCommandTrigger({ label = 'Open command menu', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return <FactoryTooltip label={label}><button {...props} type={props.type ?? 'button'} aria-label={label} className={classes('factory-command-trigger', className)} data-factory-ui={VERSION} data-factory-component="command-trigger"><Command aria-hidden="true" size={16} /><span>Command</span><kbd>⌘K</kbd></button></FactoryTooltip>;
}

export function FactoryThemeControl({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return <FactoryIconAction label={label} className={className} onClick={() => setTheme(isDark ? 'light' : 'dark')}><Sun aria-hidden="true" className="factory-theme-sun" size={17} /><Moon aria-hidden="true" className="factory-theme-moon" size={17} /></FactoryIconAction>;
}

export function FactorySheet({ open, onOpenChange, restoreFocusId, initialFocusId, title, description, side = 'right', overlay = 'dim', children }: ChildrenProps & { open: boolean; onOpenChange: (open: boolean) => void; restoreFocusId?: string; initialFocusId?: string; title: string; description?: string; side?: 'right' | 'left' | 'top' | 'bottom' | 'floating' | 'center'; overlay?: 'dim' | 'clear' }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const isFloating = side === 'floating';
  const close = () => {
    onOpenChange(false);
    window.requestAnimationFrame(() => restoreFocusId ? document.getElementById(restoreFocusId)?.focus() : returnFocus.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [open, restoreFocusId]);
  return <DialogPrimitive.Root modal={!isFloating} open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}><DialogPrimitive.Portal>{!isFloating && <DialogPrimitive.Overlay className={classes('factory-sheet-overlay', overlay === 'clear' ? 'is-clear' : undefined)} />}<DialogPrimitive.Content onOpenAutoFocus={(event) => { if (!initialFocusId) return; event.preventDefault(); window.requestAnimationFrame(() => document.getElementById(initialFocusId)?.focus()); }} onEscapeKeyDown={close} className={classes('factory-sheet', `factory-sheet-${side}`)} data-factory-ui={VERSION} data-factory-component="sheet"><header className="factory-sheet-header"><div><DialogPrimitive.Title>{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description>{description}</DialogPrimitive.Description>}</div><DialogPrimitive.Close asChild><FactoryIconAction label={`Close ${title}`}><X aria-hidden="true" size={18} /></FactoryIconAction></DialogPrimitive.Close></header>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

export function FactoryInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={classes('factory-input', className)} data-factory-ui={VERSION} data-factory-component="input" />; }
export function FactoryTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={classes('factory-textarea', className)} data-factory-ui={VERSION} data-factory-component="textarea" />; }
export function FactorySelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={classes('factory-select', className)} data-factory-ui={VERSION} data-factory-component="select" />; }
export function FactoryLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) { return <label {...props} className={classes('factory-label', className)} data-factory-ui={VERSION} data-factory-component="label" />; }
export function FactoryBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span {...props} className={classes('factory-badge', className)} data-factory-ui={VERSION} data-factory-component="badge" />; }
export function FactoryCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <section {...props} className={classes('factory-panel', className)} data-factory-ui={VERSION} data-factory-component="card" />; }
export function FactoryNotice({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classes('factory-notice', className)} data-factory-ui={VERSION} data-factory-component="notice" />; }
export function FactoryEmptyState({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classes('factory-empty-state', className)} data-factory-ui={VERSION} data-factory-component="empty-state" />; }
export function FactoryAppShell({ children, ...props }: ChildrenProps & HTMLAttributes<HTMLElement>) { return <main {...props} className={classes('factory-shell', props.className)} data-factory-ui={VERSION} data-factory-component="app-shell">{children}</main>; }
export function FactoryTabs({ children, ...props }: ChildrenProps & HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classes('factory-tabs', props.className)} data-factory-ui={VERSION} data-factory-component="tabs">{children}</div>; }
export function FactoryTable({ children, ...props }: ChildrenProps & HTMLAttributes<HTMLTableElement>) { return <table {...props} className={classes('factory-table', props.className)} data-factory-ui={VERSION} data-factory-component="table">{children}</table>; }
export function FactoryDialog({ children, ...props }: ChildrenProps & HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classes('factory-dialog', props.className)} data-factory-ui={VERSION} data-factory-component="dialog">{children}</div>; }
export function FactoryAccordion({ children, ...props }: ChildrenProps & HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classes('factory-accordion', props.className)} data-factory-ui={VERSION} data-factory-component="accordion">{children}</div>; }

export function FactoryShell({ rail, inspector, children }: ChildrenProps & { rail: ReactNode; inspector?: ReactNode }) {
  return <FactoryAppShell><div className="factory-shell-grid" data-factory-component="shell"><aside className="factory-project-rail">{rail}</aside><section className="factory-workspace">{children}</section>{inspector && <aside className="factory-inspector" data-factory-component="inspector">{inspector}</aside>}</div></FactoryAppShell>;
}

export function FactoryPanel({ children, className, ...props }: ChildrenProps & HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes('factory-panel', className)} data-factory-ui={VERSION} data-factory-component="panel">{children}</section>;
}

export function FactoryStageRail({ stages, value, onChange }: { stages: Array<{ id: string; label: string; enabled: boolean; state?: string }>; value: string; onChange: (value: string) => void }) {
  return <nav className="factory-stage-rail" aria-label="Factory lifecycle" data-factory-ui={VERSION} data-factory-component="stage-rail">{stages.map((stage, index) => <button type="button" key={stage.id} className={classes('factory-stage', stage.id === value ? 'is-active' : undefined)} aria-current={stage.id === value ? 'step' : undefined} disabled={!stage.enabled} onClick={() => onChange(stage.id)}><span>{String(index + 1).padStart(2, '0')}</span>{stage.label}{stage.state && <small>{stage.state}</small>}</button>)}</nav>;
}

export function FactoryStatus({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warning' | 'danger' }) {
  return <div className="factory-status" data-factory-ui={VERSION} data-factory-component="status" data-tone={tone}><span>{label}</span><strong>{value}</strong></div>;
}
