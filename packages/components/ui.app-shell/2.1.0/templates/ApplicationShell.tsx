import type { ReactNode } from "react";

export type NavigationItem = { label: string; href: string };
export type ApplicationShellProps = {
  activeView: string;
  children: ReactNode;
  onNavigate: (href: string) => void;
  onThemeChange: () => void;
  theme: "light" | "dark";
};

const navigation: NavigationItem[] = {{json_value:navigation}};

export function ApplicationShell({ activeView, children, onNavigate, onThemeChange, theme }: ApplicationShellProps) {
  return <div className="fp-app" data-factory-ui="1.0.0" data-factory-component="ui.app-shell@2.1.0" data-theme={theme}><aside className="fp-rail" aria-label="Application navigation"><div className="fp-mark" aria-hidden="true">FP</div><div className="fp-rail-dot" aria-hidden="true" /><div className="fp-rail-spacer" /><div className="fp-rail-dot" aria-hidden="true" /></aside><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{tsx_text:product_name}}</strong><small>Local preview</small></div><button className="fp-secondary" type="button" aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} onClick={onThemeChange}>{theme === "light" ? "Dark" : "Light"}</button></header><main className="fp-workspace"><nav className="fp-nav" aria-label="Primary navigation" role="tablist">{navigation.map((item) => <button aria-controls={`view-${item.href.slice(1) || "home"}`} aria-selected={activeView === item.href} key={item.href} onClick={() => onNavigate(item.href)} role="tab" type="button">{item.label}</button>)}</nav>{children}</main></div></div>;
}
