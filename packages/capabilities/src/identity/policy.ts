export interface PrincipalContextV1 {
  readonly principalId: string;
  readonly sessionId: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly expiresAt: string;
}

export interface DeclaredPermissionV1 {
  readonly role: string;
  readonly resource: string;
  readonly action: string;
}

export interface AuthorizationDecisionInputV1 {
  readonly principal?: PrincipalContextV1;
  readonly resource: string;
  readonly action: string;
  readonly tenantId?: string;
  readonly now?: string;
}

export type AuthorizationDenialReasonV1 =
  | "missing-session"
  | "expired-session"
  | "tenant-mismatch"
  | "undeclared-action"
  | "deny";

export type AuthorizationDecisionV1 =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: AuthorizationDenialReasonV1 };

function deny(reason: AuthorizationDenialReasonV1): AuthorizationDecisionV1 {
  return Object.freeze({ allowed: false, reason });
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isUsablePrincipal(
  principal: PrincipalContextV1 | undefined,
): principal is PrincipalContextV1 {
  return Boolean(
    principal &&
    nonEmpty(principal.principalId) &&
    nonEmpty(principal.sessionId) &&
    Array.isArray(principal.roles),
  );
}

function isExpired(
  principal: PrincipalContextV1,
  now: string | undefined,
): boolean {
  const expiry = Date.parse(principal.expiresAt);
  const current = Date.parse(now ?? new Date().toISOString());
  return Number.isNaN(expiry) || Number.isNaN(current) || expiry <= current;
}

/**
 * Evaluates one declared PolicyModel resource/action decision. It never
 * derives permissions from a route, header, provider claim, or client input.
 */
export function decideAuthorization(
  input: AuthorizationDecisionInputV1,
  rules: readonly DeclaredPermissionV1[],
): AuthorizationDecisionV1 {
  const principal = input.principal;
  if (!isUsablePrincipal(principal)) return deny("missing-session");
  if (isExpired(principal, input.now)) return deny("expired-session");
  if (input.tenantId !== undefined && principal.tenantId !== input.tenantId) {
    return deny("tenant-mismatch");
  }
  if (!nonEmpty(input.resource) || !nonEmpty(input.action)) {
    return deny("undeclared-action");
  }

  const declaredAction = rules.some(
    (rule) =>
      rule.resource === input.resource &&
      rule.action === input.action &&
      nonEmpty(rule.role),
  );
  if (!declaredAction) return deny("undeclared-action");

  return rules.some(
    (rule) =>
      rule.resource === input.resource &&
      rule.action === input.action &&
      principal.roles.includes(rule.role),
  )
    ? Object.freeze({ allowed: true })
    : deny("deny");
}
