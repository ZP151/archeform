import type { ReactNode } from "react";

export type NavigationItem = { label: string; href: string };
export type ApplicationShellProps = {
  activeView: string;
  children: ReactNode;
  navigation?: NavigationItem[];
  onNavigate: (href: string) => void;
  onThemeChange: () => void;
  theme: "light" | "dark";
};

const configuredNavigation: NavigationItem[] = {{json_value:navigation}};

export function ApplicationShell({ activeView, children, navigation: visibleNavigation, onNavigate, onThemeChange, theme }: ApplicationShellProps) {
  const renderedNavigation = visibleNavigation ?? configuredNavigation;
  return <div className="fp-app" data-factory-ui="1.3.0" data-factory-component="ui.app-shell@2.2.0" data-theme={theme}><aside className="fp-rail" aria-label="Application navigation"><div className="fp-mark" aria-hidden="true">FP</div><div className="fp-rail-dot" aria-hidden="true" /><div className="fp-rail-spacer" /><div className="fp-rail-dot" aria-hidden="true" /></aside><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{tsx_text:product_name}}</strong><small>Local preview</small></div><button className="fp-secondary" type="button" aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} onClick={onThemeChange}>{theme === "light" ? "Dark" : "Light"}</button></header><main className="fp-workspace"><nav className="fp-nav" aria-label="Primary navigation">{renderedNavigation.map((item) => <button aria-current={activeView === item.href ? "page" : undefined} key={item.href} onClick={() => onNavigate(item.href)} type="button">{item.label}</button>)}</nav>{children}</main></div></div>;
}
