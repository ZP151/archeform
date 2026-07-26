import type { ReactNode } from "react";

export type NavigationItem = { label: string; href: string };
export type ApplicationShellProps = { productName: string; navigation: NavigationItem[]; children: ReactNode };

const navigation: NavigationItem[] = {{json_value:navigation}};

export function ApplicationShell({ children }: Pick<ApplicationShellProps, "children">) {
  return <div><header><strong>{{tsx_text:product_name}}</strong><nav aria-label="Primary navigation">{navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}</nav></header><main>{children}</main></div>;
}
