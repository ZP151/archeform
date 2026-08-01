export type LocalPrincipalContext = {
  readonly principalId: string;
  readonly sessionId: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly expiresAt: string;
};

export type LocalAuthorizationDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reason:
        | "missing-session"
        | "expired-session"
        | "tenant-mismatch"
        | "undeclared-action"
        | "deny";
    };

export function resolveFixturePrincipal(
  session: LocalPrincipalContext | undefined,
  now: string,
): LocalPrincipalContext | undefined {
  if (!session || Date.parse(session.expiresAt) <= Date.parse(now)) return undefined;
  return Object.freeze({ ...session, roles: Object.freeze([...session.roles]) });
}

export function authorizeDeclaredAction(input: {
  readonly principal?: LocalPrincipalContext;
  readonly resource: string;
  readonly action: string;
  readonly tenantId?: string;
  readonly rules: readonly { readonly role: string; readonly resource: string; readonly action: string }[];
  readonly now: string;
}): LocalAuthorizationDecision {
  const principal = resolveFixturePrincipal(input.principal, input.now);
  if (!principal) return { allowed: false, reason: "missing-session" };
  if (input.tenantId !== undefined && input.tenantId !== principal.tenantId) {
    return { allowed: false, reason: "tenant-mismatch" };
  }
  const declared = input.rules.some(
    (rule) => rule.resource === input.resource && rule.action === input.action,
  );
  if (!declared) return { allowed: false, reason: "undeclared-action" };
  return input.rules.some(
    (rule) =>
      rule.resource === input.resource &&
      rule.action === input.action &&
      principal.roles.includes(rule.role),
  )
    ? { allowed: true }
    : { allowed: false, reason: "deny" };
}

export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
} as const;
