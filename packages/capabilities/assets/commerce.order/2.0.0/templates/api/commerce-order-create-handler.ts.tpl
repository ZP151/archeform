export type CommerceOrderCreateRequestV1 = Readonly<{
  readonly orderId: string;
}>;

export type CommerceOrderDraftV1 = Readonly<{
  readonly id: string;
  readonly status: "draft";
  readonly version: 0;
}>;

function parseCreateRequest(request: unknown): CommerceOrderCreateRequestV1 {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("Order create request must be an object.");
  }
  const orderId = (request as Record<string, unknown>).orderId;
  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("Order create request requires 'orderId'.");
  }
  return Object.freeze({ orderId });
}

export const commerceOrderCreateHandler = Object.freeze({
  parseRequest: parseCreateRequest,
  create(request: CommerceOrderCreateRequestV1): CommerceOrderDraftV1 {
    return Object.freeze({ id: request.orderId, status: "draft", version: 0 });
  },
});
