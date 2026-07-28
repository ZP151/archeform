import type { ReactNode } from "react";
import { ClipboardCheck, FilePlus2, Home, ListChecks, LogOut, Moon, ScrollText, Settings, Sun, UserRound } from "lucide-react";

export type NavigationItem = { label: string; href: string };
export type ApplicationShellProps = {
  activeView: string;
  children: ReactNode;
  navigation?: NavigationItem[];
  onNavigate: (href: string) => void;
  onSignOut: () => void;
  onThemeChange: () => void;
  theme: "light" | "dark";
};

const configuredNavigation: NavigationItem[] = {{json_value:navigation}};

function NavigationGlyph({ href }: { href: string }) {
  if (href === "/submit") return <FilePlus2 aria-hidden="true" size={18} strokeWidth={1.8} />;
  if (href === "/my-records") return <ListChecks aria-hidden="true" size={18} strokeWidth={1.8} />;
  if (href === "/approval-queue") return <ClipboardCheck aria-hidden="true" size={18} strokeWidth={1.8} />;
  if (href === "/audit") return <ScrollText aria-hidden="true" size={18} strokeWidth={1.8} />;
  if (href === "/profile") return <UserRound aria-hidden="true" size={18} strokeWidth={1.8} />;
  if (href === "/settings") return <Settings aria-hidden="true" size={18} strokeWidth={1.8} />;
  return <Home aria-hidden="true" size={18} strokeWidth={1.8} />;
}

export function ApplicationShell({ activeView, children, navigation: visibleNavigation, onNavigate, onSignOut, onThemeChange, theme }: ApplicationShellProps) {
  const renderedNavigation = visibleNavigation ?? configuredNavigation;
  const themeLabel = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return <div className="fp-app" data-factory-ui="1.4.0" data-factory-component="ui.app-shell@2.4.0" data-theme={theme}><aside className="fp-rail" aria-label="Application navigation"><div className="fp-mark" aria-hidden="true">FP</div><nav className="fp-rail-nav" aria-label="Primary navigation">{renderedNavigation.map((item) => <button aria-current={activeView === item.href ? "page" : undefined} aria-label={item.label} className="fp-rail-action" key={item.href} onClick={() => onNavigate(item.href)} type="button"><NavigationGlyph href={item.href} /><span className="fp-rail-tooltip" role="tooltip">{item.label}</span></button>)}</nav></aside><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{tsx_text:product_name}}</strong><small>Local preview</small></div><div className="fp-topbar-actions"><button className="fp-icon-button" type="button" aria-label={themeLabel} title={themeLabel} onClick={onThemeChange}>{theme === "light" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}</button><button className="fp-icon-button" type="button" aria-label="Sign out" title="Sign out" onClick={onSignOut}><LogOut aria-hidden="true" size={17} /><span className="fp-rail-tooltip" role="tooltip">Sign out</span></button></div></header><main className="fp-workspace">{children}</main></div></div>;
}
