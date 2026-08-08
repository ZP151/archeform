import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

/**
 * Hand-authored Published Graphs for the graph-derived verification tests.
 * The shapes are schema-valid (typed against ApplicationGraphV1) and mirror
 * what the product composer derives for the two acceptance prompts — an
 * Expense Approval product and an Appointment Booking product — plus the
 * adversarial shapes the derivation must fail closed on. They are deliberately
 * NOT the static acceptance profile fixtures: the derivation must be
 * product-agnostic, driven by the graph and composition lock alone.
 */

const sampleDigest =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export type LockPackageFixture = {
  readonly key: string;
  readonly version?: string;
  /** When present, binds the commerce order handler to a graph entity. */
  readonly orderEntity?: string;
};

/** A composition lock whose package list drives the derivation. */
export function graphLock(
  packages: readonly LockPackageFixture[],
): CapabilityCompositionLockV1 {
  return {
    apiVersion: "factory.composition/v1",
    applicationGraphChecksum:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    packages: packages.map(({ key, version, orderEntity }) => ({
      lock: {
        key,
        version: version ?? "1.0.0",
        packageRoot: `packages/${key}`,
        manifestDigest: sampleDigest,
        lifecycle: "golden",
      },
      bindings:
        orderEntity === undefined
          ? {}
          : { orderEntity: { graphSymbol: `graph.domain.${orderEntity}` } },
    })),
    resolvedContributionDigests: [],
    providedAndRequiredInterfaces: [],
    targetRuntimeInterfaceVersions: [],
    resolvedDependencyOrder: packages.map(({ key }) => key),
    lockDigest: sampleDigest,
  };
}

function baseGraph(id: string, name: string) {
  return {
    apiVersion: "factory.application-graph/v1" as const,
    metadata: { id, workspaceId: "test-workspace", name },
    page: { pages: [], navigation: [] },
    integration: { providers: [], capabilities: [] },
    experience: {
      theme: { mode: "light" as const, tokens: {} },
      locales: ["en"],
    },
  };
}

/** Acceptance prompt A: an Expense Approval product. */
export function expenseApprovalGraph(): ApplicationGraphV1 {
  return {
    ...baseGraph("expense-approval", "Expense Approval"),
    domain: {
      entities: [
        {
          key: "expense",
          label: "Expense",
          fields: [
            { key: "amount", type: "decimal", required: true },
            {
              key: "category",
              type: "enum",
              required: true,
              values: ["travel", "office"],
            },
            { key: "incurredOn", type: "date", required: true },
            { key: "receipt", type: "url", required: false },
            { key: "notes", type: "text", required: false },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["draft", "submitted", "approved", "rejected"],
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
      seedData: [
        {
          entity: "expense",
          id: "sample-expense",
          values: {
            amount: 125.5,
            category: "travel",
            incurredOn: "2026-08-01",
            status: "draft",
          },
        },
      ],
    },
    policy: {
      roles: ["employee", "manager", "finance"],
      permissions: [
        {
          role: "employee",
          resource: "expense",
          actions: ["create", "read", "submit"],
        },
        {
          role: "manager",
          resource: "expense",
          actions: ["read", "approve", "reject"],
        },
        { role: "finance", resource: "expense", actions: ["read", "audit"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "expense-flow",
          entity: "expense",
          initialState: "draft",
          states: ["draft", "submitted", "approved", "rejected"],
          events: ["submit", "approve", "reject"],
          transitions: [
            {
              from: "draft",
              event: "submit",
              to: "submitted",
              roles: ["employee"],
            },
            {
              from: "submitted",
              event: "approve",
              to: "approved",
              roles: ["manager"],
            },
            {
              from: "submitted",
              event: "reject",
              to: "rejected",
              roles: ["manager"],
            },
          ],
        },
      ],
    },
  };
}

/** Acceptance prompt B: an Appointment Booking product. */
export function appointmentBookingGraph(): ApplicationGraphV1 {
  return {
    ...baseGraph("appointment-booking", "Appointment Booking"),
    domain: {
      entities: [
        {
          key: "appointment",
          label: "Appointment",
          fields: [
            { key: "customerName", type: "string", required: true },
            { key: "slot", type: "datetime", required: true },
            { key: "slotLimit", type: "integer", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["requested", "confirmed", "cancelled"],
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
      seedData: [
        {
          entity: "appointment",
          id: "sample-appointment",
          values: {
            customerName: "Sample Customer",
            slot: "2026-08-01T09:00:00Z",
            slotLimit: 12,
            status: "requested",
          },
        },
      ],
    },
    policy: {
      roles: ["customer", "clinic"],
      permissions: [
        {
          role: "customer",
          resource: "appointment",
          actions: ["create", "read", "book", "cancel"],
        },
        {
          role: "clinic",
          resource: "appointment",
          actions: ["read", "confirm"],
        },
      ],
    },
    flow: {
      flows: [
        {
          id: "appointment-flow",
          entity: "appointment",
          initialState: "requested",
          states: ["requested", "confirmed", "cancelled"],
          events: ["book", "confirm", "cancel"],
          transitions: [
            {
              from: "requested",
              event: "book",
              to: "confirmed",
              roles: ["customer"],
            },
            {
              from: "requested",
              event: "confirm",
              to: "confirmed",
              roles: ["clinic"],
            },
            {
              from: "confirmed",
              event: "cancel",
              to: "cancelled",
              roles: ["customer"],
            },
          ],
        },
      ],
    },
  };
}

/** Every policy role is allowed on the first transition: the denial must fall back to an anonymous request. */
export function singleRoleGraph(): ApplicationGraphV1 {
  return {
    ...baseGraph("single-role-product", "Single Role Product"),
    domain: {
      entities: [
        {
          key: "widget",
          label: "Widget",
          fields: [
            { key: "name", type: "string", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["active", "archived"],
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
      seedData: [
        {
          entity: "widget",
          id: "sample-widget",
          values: { name: "Sample Widget", status: "active" },
        },
      ],
    },
    policy: {
      roles: ["owner"],
      permissions: [
        { role: "owner", resource: "widget", actions: ["create", "read"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "widget-flow",
          entity: "widget",
          initialState: "active",
          states: ["active", "archived"],
          events: ["archive"],
          transitions: [
            {
              from: "active",
              event: "archive",
              to: "archived",
              roles: ["owner"],
            },
          ],
        },
      ],
    },
  };
}

/** A commerce order entity: versioned transitions the derivation omits. */
export function orderGraph(): ApplicationGraphV1 {
  return {
    ...baseGraph("commerce-order-product", "Commerce Order Product"),
    domain: {
      entities: [
        {
          key: "order",
          label: "Order",
          fields: [
            { key: "amount", type: "decimal", required: true },
            { key: "version", type: "integer", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["pending", "paid"],
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
      seedData: [
        {
          entity: "order",
          id: "sample-order",
          values: { amount: 99, version: 0, status: "pending" },
        },
      ],
    },
    policy: {
      roles: ["buyer"],
      permissions: [
        { role: "buyer", resource: "order", actions: ["create", "read"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "order-flow",
          entity: "order",
          initialState: "pending",
          states: ["pending", "paid"],
          events: ["pay"],
          transitions: [
            { from: "pending", event: "pay", to: "paid", roles: ["buyer"] },
          ],
        },
      ],
    },
  };
}

/** Schema-valid graph whose enum field declares no values: the derivation fails closed. */
export function expenseWithoutEnumValuesGraph(): ApplicationGraphV1 {
  return {
    ...expenseApprovalGraph(),
    domain: {
      ...expenseApprovalGraph().domain,
      entities: [
        {
          key: "expense",
          label: "Expense",
          fields: [
            { key: "amount", type: "decimal", required: true },
            { key: "category", type: "enum", required: true },
            { key: "incurredOn", type: "date", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["draft", "submitted", "approved", "rejected"],
            },
          ],
          indexes: [],
        },
      ],
    },
  };
}

/** A transition event whose derived step ID collides with the create step: the derivation fails closed. */
export function expenseWithCollidingTransitionGraph(): ApplicationGraphV1 {
  const graph = expenseApprovalGraph();
  const flow = graph.flow.flows[0];
  return {
    ...graph,
    flow: {
      flows: [
        {
          ...flow,
          events: [...flow.events, "create"],
          transitions: [
            ...flow.transitions,
            {
              from: "draft",
              event: "create",
              to: "submitted",
              roles: ["employee"],
            },
          ],
        },
      ],
    },
  };
}

/** A metadata id too long for the profile key contract: the key is digest-bounded. */
export function longIdGraph(): ApplicationGraphV1 {
  const graph = expenseApprovalGraph();
  return {
    ...graph,
    metadata: { ...graph.metadata, id: "l".repeat(128) },
  };
}
