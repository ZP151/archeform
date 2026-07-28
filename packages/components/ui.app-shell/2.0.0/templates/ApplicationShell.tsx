import type { ReactNode } from "react";

export type NavigationItem = { label: string; href: string };
export type ApplicationShellProps = { productName: string; navigation: NavigationItem[]; children: ReactNode };

const navigation: NavigationItem[] = {{json_value:navigation}};

const styles = `
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f8f7; color: #121a17; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #f7f8f7; }
  button, input, select, textarea { font: inherit; }
  button { cursor: pointer; }
  .fp-app { min-height: 100vh; display: grid; grid-template-columns: 64px minmax(0, 1fr); background: #f7f8f7; }
  .fp-rail { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 14px 0; border-right: 1px solid #e3e8e5; background: #fbfcfb; }
  .fp-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: #0f7660; color: #ecfdf5; font-size: 15px; font-weight: 800; letter-spacing: -0.08em; }
  .fp-rail-spacer { flex: 1; }
  .fp-rail-dot { width: 6px; height: 6px; border-radius: 99px; background: #48a879; }
  .fp-frame { min-width: 0; }
  .fp-topbar { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 28px; border-bottom: 1px solid #e3e8e5; background: rgba(251,252,251,.9); backdrop-filter: blur(16px); }
  .fp-identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .fp-identity strong { overflow: hidden; max-width: 28rem; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; letter-spacing: -.02em; }
  .fp-identity small, .fp-topbar small { color: #75817c; font-size: 11px; }
  .fp-status { display: inline-flex; align-items: center; gap: 7px; color: #4b5a54; font-size: 11px; }
  .fp-status::before { width: 7px; height: 7px; border-radius: 99px; background: #22a06b; box-shadow: 0 0 0 4px #e6f7ee; content: ""; }
  .fp-workspace { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 42px 0 72px; }
  .fp-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
  .fp-kicker { margin: 0 0 7px; color: #799087; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  .fp-hero h1 { margin: 0; font-size: clamp(30px, 4vw, 52px); letter-spacing: -.06em; line-height: .98; }
  .fp-hero p { max-width: 420px; margin: 0; color: #64716c; font-size: 14px; line-height: 1.55; }
  .fp-nav { display: flex; gap: 4px; margin: 0 0 24px; padding: 0; border-bottom: 1px solid #dde5e0; list-style: none; overflow: auto; }
  .fp-nav a { display: block; padding: 11px 13px 12px; color: #6b7872; font-size: 12px; font-weight: 650; text-decoration: none; white-space: nowrap; border-bottom: 2px solid transparent; }
  .fp-nav a:hover { color: #0f7660; border-bottom-color: #65c39a; }
  .fp-app-content { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 22px; align-items: start; }
  .fp-main { min-width: 0; display: grid; gap: 16px; }
  .fp-side { position: sticky; top: 82px; display: grid; gap: 12px; }
  .fp-card { border: 1px solid #e0e7e3; border-radius: 12px; background: #fff; }
  .fp-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 18px 13px; border-bottom: 1px solid #eef2f0; }
  .fp-card-header h2, .fp-card-header h3 { margin: 0; font-size: 14px; letter-spacing: -.025em; }
  .fp-card-body { padding: 18px; }
  .fp-card-meta { color: #7e8b85; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .fp-rolebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 13px; border: 1px solid #dfe8e3; border-radius: 10px; background: #f7fbf8; }
  .fp-rolebar label { display: flex; align-items: center; gap: 9px; color: #63716b; font-size: 12px; }
  .fp-rolebar select { min-width: 132px; border: 0; background: transparent; color: #17221d; font-weight: 650; outline: 0; }
  .fp-icon-button { display: inline-grid; width: 32px; height: 32px; place-items: center; border: 1px solid #d7e2dc; border-radius: 8px; background: #fff; color: #52615a; font-size: 15px; }
  .fp-icon-button:hover { border-color: #93cbae; color: #0f7660; }
  .fp-status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 7px; border-radius: 99px; background: #e8f7ef; color: #15734a; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .fp-status-chip::before { width: 5px; height: 5px; border-radius: 50%; background: currentColor; content: ""; }
  .fp-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
  .fp-field { display: grid; gap: 6px; color: #53625b; font-size: 11px; font-weight: 700; }
  .fp-field input, .fp-field select { width: 100%; min-height: 38px; border: 1px solid #d9e2dd; border-radius: 8px; background: #fcfdfc; color: #16211b; padding: 8px 10px; outline: none; }
  .fp-field input:focus, .fp-field select:focus { border-color: #21a66f; box-shadow: 0 0 0 3px #def5e8; }
  .fp-form-actions { display: flex; justify-content: flex-end; grid-column: 1 / -1; padding-top: 5px; }
  .fp-primary { min-height: 38px; border: 1px solid #147a50; border-radius: 8px; background: #147a50; color: #fff; padding: 0 14px; font-size: 12px; font-weight: 750; }
  .fp-primary:hover { background: #0d6440; }
  .fp-secondary { min-height: 32px; border: 1px solid #d8e2dc; border-radius: 7px; background: #fff; color: #52615a; padding: 0 10px; font-size: 11px; font-weight: 700; }
  .fp-danger { border-color: #f0c9c5; color: #a63a32; }
  .fp-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .fp-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid #eff3f1; }
  .fp-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .fp-row:first-child { padding-top: 0; }
  .fp-row-title { display: block; margin-bottom: 4px; color: #1d2923; font-size: 12px; font-weight: 720; }
  .fp-row-copy { display: block; overflow: hidden; max-width: 34rem; color: #75827c; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .fp-actions { display: flex; gap: 6px; flex: none; }
  .fp-empty { margin: 0; color: #829087; font-size: 12px; }
  .fp-side dl { display: grid; gap: 10px; margin: 0; }
  .fp-side dl div { display: flex; justify-content: space-between; gap: 10px; color: #66746d; font-size: 11px; }
  .fp-side dt, .fp-side dd { margin: 0; }
  .fp-side dd { color: #26342d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }
  .fp-login { width: min(460px, calc(100% - 32px)); margin: 15vh auto; }
  .fp-login .fp-card-body { display: grid; gap: 20px; padding: 28px; }
  .fp-login h1 { margin: 0; font-size: 29px; letter-spacing: -.05em; }
  @media (prefers-color-scheme: dark) { :root { color-scheme: dark; background: #101512; color: #edf5ef; } body, .fp-app { background: #101512; } .fp-rail, .fp-topbar { border-color: #26322b; background: rgba(16,21,18,.92); } .fp-workspace { color: #edf5ef; } .fp-hero p, .fp-identity small, .fp-topbar small, .fp-nav a, .fp-card-meta, .fp-field, .fp-row-copy, .fp-empty, .fp-side dl div { color: #94a59b; } .fp-nav { border-color: #2b3830; } .fp-card, .fp-icon-button, .fp-secondary { border-color: #2c3931; background: #151d18; color: #dce8df; } .fp-card-header { border-color: #25322b; } .fp-rolebar { border-color: #2c3b32; background: #142019; } .fp-rolebar select, .fp-row-title, .fp-side dd { color: #edf5ef; } .fp-field input, .fp-field select { border-color: #33443a; background: #101612; color: #edf5ef; } .fp-row { border-color: #26332b; } }
  @media (max-width: 760px) { .fp-app { grid-template-columns: 1fr; } .fp-rail { display: none; } .fp-topbar { height: 54px; padding: 0 16px; } .fp-workspace { width: min(100% - 28px, 1180px); padding-top: 24px; } .fp-hero { display: block; } .fp-hero p { margin-top: 12px; } .fp-app-content { grid-template-columns: 1fr; } .fp-side { position: static; } .fp-form-grid { grid-template-columns: 1fr; } }
`;

export function ApplicationShell({ children }: Pick<ApplicationShellProps, "children">) {
  return <div className="fp-app" data-factory-component="ui.app-shell@2.0.0"><style>{styles}</style><aside className="fp-rail" aria-label="Application navigation"><div className="fp-mark" aria-hidden="true">FP</div><div className="fp-rail-dot" aria-hidden="true" /><div className="fp-rail-spacer" /><div className="fp-rail-dot" aria-hidden="true" /></aside><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{tsx_text:product_name}}</strong><small>v1</small></div><span className="fp-status">Local preview</span></header><main className="fp-workspace"><nav className="fp-nav" aria-label="Primary navigation">{navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}</nav>{children}</main></div></div>;
}
