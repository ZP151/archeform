export type OrderCreateRequestV1 = Readonly<{
  role: string;
  entityKey: string;
  input: Readonly<Record<string, unknown>>;
}>;

export type CreatedOrderV1 = Readonly<{
  id: string;
  status: string;
  version: 0;
}>;

export interface OrderCreateStoreV1 {
  createInitial(input: Readonly<Record<string, unknown>>): Promise<CreatedOrderV1>;
}

export interface OrderCreateAuthorizerV1 {
  assertCreateAllowed(role: string): Promise<void>;
}

function parseRequest(request: unknown): OrderCreateRequestV1 {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("Order create request must be an object.");
  }
  const value = request as Record<string, unknown>;
  const allowedKeys = new Set(["role", "entityKey", "input"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new Error("Order create request contains undeclared fields.");
  }
  if (typeof value.role !== "string" || !value.role.trim()) {
    throw new Error("Order create request requires 'role'.");
  }
  if (value.entityKey !== "{{orderEntity}}") {
    throw new Error("Order create request targets an undeclared entity.");
  }
  if (!value.input || typeof value.input !== "object" || Array.isArray(value.input)) {
    throw new Error("Order create request requires an input object.");
  }
  const input = value.input as Record<string, unknown>;
  for (const key of ["id", "status", "version"] as const) {
    if (key in input) throw new Error(`Order create input must not declare '${key}'.`);
  }
  return Object.freeze({
    role: value.role,
    entityKey: value.entityKey,
    input: Object.freeze({ ...input }),
  });
}

export const commerceOrderCreateHandler = Object.freeze({
  async create(
    request: unknown,
    dependencies: Readonly<{
      store: OrderCreateStoreV1;
      authorizer: OrderCreateAuthorizerV1;
    }>,
  ): Promise<CreatedOrderV1> {
    const parsed = parseRequest(request);
    await dependencies.authorizer.assertCreateAllowed(parsed.role);
    return Object.freeze(await dependencies.store.createInitial(parsed.input));
  },
});
