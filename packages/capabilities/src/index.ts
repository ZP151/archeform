export type FactoryProfile =
  | "expense-approval"
  | "restaurant-ordering"
  | "simple-ecommerce";

export type CapabilityCategory = "core" | "commerce";

export interface CapabilityDefinition {
  readonly key: string;
  readonly name: string;
  readonly category: CapabilityCategory;
  readonly description: string;
  readonly profiles: readonly FactoryProfile[];
  readonly effects: readonly string[];
}

const catalog: readonly CapabilityDefinition[] = [
  {
    key: "core.audit",
    name: "Audit trail",
    category: "core",
    description: "Records actor, action, subject, and immutable timestamp evidence.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["audit.record"],
  },
  {
    key: "core.crud",
    name: "Managed records",
    category: "core",
    description: "Creates, reads, updates, and deletes validated domain records.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["data.create", "data.read", "data.update", "data.delete"],
  },
  {
    key: "core.notification",
    name: "Notifications",
    category: "core",
    description: "Emits bounded in-app and provider-ready notification events.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["notification.send"],
  },
  {
    key: "core.workflow",
    name: "Workflow",
    category: "core",
    description: "Runs declared state transitions, guards, and human tasks.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["flow.transition", "flow.assign-task"],
  },
  {
    key: "commerce.catalog",
    name: "Catalog",
    category: "commerce",
    description: "Publishes browsable products or menu items.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["catalog.list", "catalog.read"],
  },
  {
    key: "commerce.cart",
    name: "Cart",
    category: "commerce",
    description: "Maintains a customer-owned set of purchasable line items.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["cart.add", "cart.remove", "cart.checkout"],
  },
  {
    key: "commerce.inventory",
    name: "Inventory",
    category: "commerce",
    description: "Tracks and reserves available stock or menu availability.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["inventory.reserve", "inventory.release", "inventory.decrement"],
  },
  {
    key: "commerce.order",
    name: "Order lifecycle",
    category: "commerce",
    description: "Creates orders and manages declared fulfilment states.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["order.create", "order.transition"],
  },
  {
    key: "commerce.simulated-payment",
    name: "Simulated payment",
    category: "commerce",
    description: "Confirms a deterministic, credential-free payment simulation.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["payment.simulate"],
  },
] as const;

export const capabilityCatalog = Object.freeze([...catalog]);

export function getCapability(key: string): CapabilityDefinition {
  const capability = capabilityCatalog.find((entry) => entry.key === key);
  if (!capability) {
    throw new Error(`Unknown Factory capability: ${key}`);
  }
  return capability;
}

export function capabilitiesForProfile(
  profile: FactoryProfile,
): readonly CapabilityDefinition[] {
  return capabilityCatalog.filter((capability) => capability.profiles.includes(profile));
}

export interface ProfileGraphStarter {
  readonly profile: FactoryProfile;
  readonly graph: ApplicationGraphV1;
}

const factoryCapabilities = (keys: readonly string[]) =>
  keys.map((key) => ({
    key,
    providerId: "factory",
    operation: key.split(".").at(-1) ?? key,
  }));

const starterGraph = (
  metadata: ApplicationGraphV1["metadata"],
  page: ApplicationGraphV1["page"],
  domain: ApplicationGraphV1["domain"],
  policy: ApplicationGraphV1["policy"],
  flow: ApplicationGraphV1["flow"],
  capabilityKeys: readonly string[],
): ApplicationGraphV1 => ({
  apiVersion: "factory.application-graph/v1",
  metadata,
  page,
  domain,
  policy,
  flow,
  integration: { providers: [], capabilities: factoryCapabilities(capabilityKeys) },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
});

export const profileGraphs: readonly ProfileGraphStarter[] = Object.freeze([
  {
    profile: "expense-approval",
    graph: starterGraph(
      { id: "expense-approval", workspaceId: "local-workspace", name: "Expense approval" },
      {
        pages: [
          { id: "expenses", route: "/expenses", title: "Expenses", blocks: [{ id: "expense-list", type: "collection", entity: "expense" }] },
          { id: "new-expense", route: "/expenses/new", title: "New expense", blocks: [{ id: "expense-form", type: "form", entity: "expense" }] },
        ],
        navigation: [{ id: "expenses", label: "Expenses", pageId: "expenses", icon: "receipt" }],
      },
      {
        entities: [
          {
            key: "expense",
            label: "Expense",
            fields: [
              { key: "amount", type: "decimal", required: true },
              { key: "description", type: "text", required: true },
              { key: "status", type: "enum", required: true, values: ["draft", "submitted", "approved", "rejected"] },
            ],
            indexes: [{ fields: ["status"] }],
          },
        ],
        relations: [],
      },
      {
        roles: ["employee", "manager", "finance"],
        permissions: [
          { role: "employee", resource: "expense", actions: ["create", "read"] },
          { role: "manager", resource: "expense", actions: ["read", "approve", "reject"] },
          { role: "finance", resource: "expense", actions: ["read", "audit"] },
        ],
      },
      {
        flows: [
          {
            id: "expense-review",
            entity: "expense",
            initialState: "draft",
            states: ["draft", "submitted", "approved", "rejected"],
            events: ["submit", "approve", "reject"],
            transitions: [
              { from: "draft", event: "submit", to: "submitted", effects: [{ capability: "audit.record", operation: "record" }] },
              { from: "submitted", event: "approve", to: "approved", roles: ["manager"], effects: [{ capability: "audit.record", operation: "record" }] },
              { from: "submitted", event: "reject", to: "rejected", roles: ["manager"], effects: [{ capability: "audit.record", operation: "record" }] },
            ],
          },
        ],
      },
      ["audit.record", "notification.send"],
    ),
  },
  {
    profile: "restaurant-ordering",
    graph: starterGraph(
      { id: "restaurant-ordering", workspaceId: "local-workspace", name: "Restaurant ordering" },
      {
        pages: [
          { id: "menu", route: "/menu", title: "Menu", blocks: [{ id: "menu-catalog", type: "catalog", entity: "menu-item" }] },
          { id: "cart", route: "/cart", title: "Cart", blocks: [{ id: "cart-lines", type: "cart", entity: "order" }] },
          { id: "kitchen", route: "/kitchen", title: "Kitchen", blocks: [{ id: "kitchen-queue", type: "queue", entity: "order" }] },
        ],
        navigation: [
          { id: "menu", label: "Menu", pageId: "menu", icon: "utensils" },
          { id: "cart", label: "Cart", pageId: "cart", icon: "shopping-bag" },
          { id: "kitchen", label: "Kitchen", pageId: "kitchen", icon: "chef-hat" },
        ],
      },
      {
        entities: [
          { key: "menu-item", label: "Menu item", fields: [{ key: "name", type: "string", required: true }, { key: "price", type: "decimal", required: true }], indexes: [] },
          { key: "order", label: "Order", fields: [{ key: "status", type: "enum", required: true, values: ["cart", "paid", "preparing", "ready"] }], indexes: [{ fields: ["status"] }] },
        ],
        relations: [{ from: "order", to: "menu-item", kind: "many-to-many" }],
      },
      {
        roles: ["customer", "kitchen", "manager"],
        permissions: [
          { role: "customer", resource: "menu-item", actions: ["read"] },
          { role: "customer", resource: "order", actions: ["create", "read"] },
          { role: "kitchen", resource: "order", actions: ["read", "update"] },
        ],
      },
      {
        flows: [{
          id: "restaurant-order",
          entity: "order",
          initialState: "cart",
          states: ["cart", "paid", "preparing", "ready"],
          events: ["pay", "start-preparing", "mark-ready"],
          transitions: [
            { from: "cart", event: "pay", to: "paid", effects: [{ capability: "payment.simulate", operation: "simulate" }] },
            { from: "paid", event: "start-preparing", to: "preparing", roles: ["kitchen"] },
            { from: "preparing", event: "mark-ready", to: "ready", roles: ["kitchen"], effects: [{ capability: "notification.send", operation: "send" }] },
          ],
        }],
      },
      ["payment.simulate", "notification.send"],
    ),
  },
  {
    profile: "simple-ecommerce",
    graph: starterGraph(
      { id: "simple-ecommerce", workspaceId: "local-workspace", name: "Simple ecommerce" },
      {
        pages: [
          { id: "catalog", route: "/", title: "Catalog", blocks: [{ id: "product-catalog", type: "catalog", entity: "product" }] },
          { id: "checkout", route: "/checkout", title: "Checkout", blocks: [{ id: "checkout-form", type: "checkout", entity: "order" }] },
          { id: "orders", route: "/orders", title: "Orders", blocks: [{ id: "order-list", type: "collection", entity: "order" }] },
        ],
        navigation: [
          { id: "catalog", label: "Catalog", pageId: "catalog", icon: "store" },
          { id: "orders", label: "Orders", pageId: "orders", icon: "package" },
        ],
      },
      {
        entities: [
          { key: "product", label: "Product", fields: [{ key: "name", type: "string", required: true }, { key: "price", type: "decimal", required: true }, { key: "stock", type: "integer", required: true }], indexes: [] },
          { key: "order", label: "Order", fields: [{ key: "status", type: "enum", required: true, values: ["cart", "paid", "fulfilled"] }], indexes: [{ fields: ["status"] }] },
        ],
        relations: [{ from: "order", to: "product", kind: "many-to-many" }],
      },
      {
        roles: ["customer", "operator"],
        permissions: [
          { role: "customer", resource: "product", actions: ["read"] },
          { role: "customer", resource: "order", actions: ["create", "read"] },
          { role: "operator", resource: "product", actions: ["create", "read", "update"] },
          { role: "operator", resource: "order", actions: ["read", "update"] },
        ],
      },
      {
        flows: [{
          id: "ecommerce-order",
          entity: "order",
          initialState: "cart",
          states: ["cart", "paid", "fulfilled"],
          events: ["pay", "fulfil"],
          transitions: [
            { from: "cart", event: "pay", to: "paid", effects: [{ capability: "payment.simulate", operation: "simulate" }, { capability: "inventory.decrement", operation: "decrement" }] },
            { from: "paid", event: "fulfil", to: "fulfilled", roles: ["operator"], effects: [{ capability: "audit.record", operation: "record" }] },
          ],
        }],
      },
      ["payment.simulate", "inventory.decrement", "audit.record"],
    ),
  },
]);
import type { ApplicationGraphV1 } from "@factory/graph";
