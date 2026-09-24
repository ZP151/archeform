/**
 * The checked-in bridge between reviewed definition data and its executable
 * acceptance case. This is a routing index only: it cannot register a
 * definition or promote a product to accepted status.
 */
const binding = (value) => Object.freeze(value);

export const definitionCaseBindings = Object.freeze([
  binding({
    definitionKey: "restaurant-ordering",
    runtimeFamily: "restaurant-ordering/v1",
    caseId: "restaurant-ordering-local",
    casePath: "e2e/consumer-restaurant.spec.ts",
    evidencePath: "docs/acceptance/restaurant-ordering-mvp.md",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "expense-approval",
    runtimeFamily: "approval-correction/v1",
    caseId: "expense-approval-local",
    casePath: "e2e/consumer-approval.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/consumer-approval-correction/expense",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "purchase-request-approval",
    runtimeFamily: "approval-correction/v1",
    caseId: "purchase-request-approval-local",
    casePath: "e2e/consumer-purchase-request.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/consumer-approval-correction/purchase",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "team-task-tracking",
    runtimeFamily: "task-mutation/v1",
    caseId: "team-task-tracking-local",
    casePath: "e2e/consumer-task.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/consumer-task-correction/team-task-tracking",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "publication-review",
    runtimeFamily: "approval-correction/v1",
    caseId: "publication-review-local",
    casePath: "e2e/approval-definition-batch.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/definition-batch-one/publication-review",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "training-funding-approval",
    runtimeFamily: "approval-correction/v1",
    caseId: "training-funding-approval-local",
    casePath: "e2e/training-funding.spec.ts",
    evidencePath: "docs/acceptance/evidence/training-funding",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "equipment-procurement-approval",
    runtimeFamily: "approval-correction/v1",
    caseId: "equipment-procurement-approval-local",
    casePath: "e2e/equipment-procurement.spec.ts",
    evidencePath: "docs/acceptance/evidence/equipment-procurement",
    protectedFixture: true,
  }),
  binding({
    definitionKey: "appointment-booking-v1",
    runtimeFamily: "appointment-booking/v1",
    caseId: "appointment-booking-v1-historical-compatibility",
    casePath: "packages/compiler/test/definition-data-compatibility.test.ts",
    evidencePath: "docs/acceptance/evidence/appointment-booking",
    protectedFixture: false,
  }),
  binding({
    definitionKey: "knowledge-resource-directory",
    runtimeFamily: "content-directory/v1",
    caseId: "knowledge-resource-directory-local",
    casePath: "e2e/content-directory.spec.ts",
    evidencePath: "docs/acceptance/evidence/content-directory",
    protectedFixture: false,
  }),
  binding({
    definitionKey: "supplies-stockroom",
    runtimeFamily: "inventory-operations/v1",
    caseId: "supplies-stockroom-local",
    casePath: "e2e/inventory-operations.spec.ts",
    evidencePath: "docs/acceptance/evidence/inventory-operations",
    protectedFixture: false,
  }),
  binding({
    definitionKey: "appointment-booking-v2",
    runtimeFamily: "appointment-booking/v2",
    caseId: "appointment-booking-v2-consumer-local",
    casePath: "e2e/appointment-booking.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/accepted-family-consumer-delivery/appointment",
    protectedFixture: false,
  }),
  binding({
    definitionKey: "facilities-service-desk",
    runtimeFamily: "service-work-orders/v1",
    caseId: "facilities-service-desk-local",
    casePath: "e2e/service-work-orders.spec.ts",
    evidencePath: "docs/acceptance/evidence/service-work-orders",
    protectedFixture: false,
  }),
  binding({
    definitionKey: "customer-support-desk",
    runtimeFamily: "customer-requests/v1",
    caseId: "customer-support-desk-local",
    casePath: "e2e/customer-requests.spec.ts",
    evidencePath: "docs/acceptance/evidence/customer-requests",
    protectedFixture: false,
  }),
]);

export const admittedDefinitionKeys = Object.freeze(
  definitionCaseBindings.map(({ definitionKey }) => definitionKey),
);

export const historicalDefinitionKeys = Object.freeze(
  definitionCaseBindings
    .filter(({ protectedFixture }) => protectedFixture)
    .map(({ definitionKey }) => definitionKey),
);
