import {
  assertExperienceBrief,
  assertProductIntent,
  createDraftRevision,
  type ApplicationGraphV3,
  type DraftRevisionV1,
  type ExperienceBriefV1,
  type ProductIntentV1,
} from "@factory/graph";

import { composeDefaultCapabilityDraft } from "../src/index.js";

export const restaurantPageContract = [
  [
    "customer-home",
    "/",
    "restaurant-customer-home",
    [
      ["home-hero", "menu-hero"],
      ["home-categories", "category-rail"],
      ["home-items", "menu-item-card"],
    ],
  ],
  [
    "customer-menu",
    "/menu",
    "restaurant-customer-menu",
    [
      ["menu-categories", "category-rail"],
      ["menu-items", "menu-item-card"],
    ],
  ],
  [
    "customer-dish-detail",
    "/menu/:itemId",
    "restaurant-customer-dish-detail",
    [["dish-configurator", "dish-configurator"]],
  ],
  [
    "customer-cart",
    "/cart",
    "restaurant-customer-cart",
    [
      ["cart-lines", "cart-line"],
      ["cart-summary", "order-summary"],
    ],
  ],
  [
    "customer-checkout",
    "/checkout",
    "restaurant-customer-checkout",
    [
      ["checkout-summary", "order-summary"],
      ["checkout-payment", "payment-state"],
    ],
  ],
  [
    "customer-orders",
    "/orders",
    "restaurant-customer-orders",
    [["customer-order-list", "active-order-list"]],
  ],
  [
    "customer-order-detail",
    "/orders/:orderId",
    "restaurant-customer-order-detail",
    [
      ["customer-order-summary", "order-summary"],
      ["customer-payment-state", "payment-state"],
      ["customer-order-timeline", "order-timeline"],
    ],
  ],
  [
    "customer-profile",
    "/profile",
    "restaurant-customer-profile",
    [["customer-profile-form", "customer-profile-form"]],
  ],
  [
    "merchant-dashboard",
    "/merchant",
    "restaurant-merchant-dashboard",
    [
      ["dashboard-metrics", "metric-card"],
      ["dashboard-orders", "active-order-list"],
      ["dashboard-tables", "table-map"],
    ],
  ],
  [
    "merchant-menu-management",
    "/merchant/menu",
    "restaurant-merchant-menu-management",
    [
      ["merchant-menu-table", "menu-management-table"],
      ["merchant-availability", "availability-toggle"],
    ],
  ],
  [
    "merchant-orders",
    "/merchant/orders",
    "restaurant-merchant-orders",
    [
      ["merchant-order-list", "active-order-list"],
      ["merchant-order-summary", "order-summary"],
      ["merchant-payment-state", "payment-state"],
    ],
  ],
  [
    "merchant-kitchen-queue",
    "/merchant/kitchen",
    "restaurant-merchant-kitchen-queue",
    [["kitchen-tickets", "kitchen-ticket"]],
  ],
  [
    "merchant-tables",
    "/merchant/tables",
    "restaurant-merchant-tables",
    [["merchant-table-map", "table-map"]],
  ],
  [
    "merchant-users-roles",
    "/merchant/users",
    "restaurant-merchant-users-roles",
    [["merchant-role-matrix", "role-matrix"]],
  ],
  [
    "merchant-settings",
    "/merchant/settings",
    "restaurant-merchant-settings",
    [["restaurant-settings-form", "restaurant-settings-form"]],
  ],
] as const;

export const customerOwnedPageKeys = restaurantPageContract
  .slice(0, 8)
  .map(([key]) => key);
export const merchantOwnedPageKeys = restaurantPageContract
  .slice(8)
  .map(([key]) => key);
export const restaurantJourneyKeys = [
  "customer-place-order",
  "manager-cancel-submitted-order",
  "manager-cancel-paid-order",
  "manager-table-session",
  "manager-expire-open-table-session",
  "manager-expire-active-table-session",
  "manager-adjust-inventory",
] as const;

export const clientAuthorityKeys = [
  "restaurant-principal.displayName",
  "restaurant-principal.locale",
  "restaurant-principal.marketingOptIn",
  "restaurant-location.name",
  "restaurant-location.currency",
  "restaurant-location.active",
  "restaurant-location.taxRate",
  "restaurant-location.serviceChargeRate",
  "restaurant-location.timezone",
  "restaurant-location.logoUrl",
  "restaurant-location.serviceOpen",
  "restaurant-table.code",
  "restaurant-table.number",
  "restaurant-table.active",
  "restaurant-table.capacity",
  "menu-category.name",
  "menu-category.sortOrder",
  "menu-category.active",
  "menu-item.categoryKey",
  "menu-item.name",
  "menu-item.description",
  "menu-item.price",
  "menu-item.available",
  "menu-item.preparationMinutes",
  "menu-item.imageUrl",
  "menu-option-group.menuItemId",
  "menu-option-group.name",
  "menu-option-group.selectionMode",
  "menu-option-group.minimumSelections",
  "menu-option-group.maximumSelections",
  "menu-option-group.required",
  "menu-option-group.active",
  "menu-option-group.sortOrder",
  "menu-option.optionGroupId",
  "menu-option.name",
  "menu-option.label",
  "menu-option.priceDelta",
  "menu-option.available",
  "menu-option.sortOrder",
  "order.fulfilmentType",
  "order.orderNote",
  "order.priority",
  "order-line.quantity",
  "order-line.lineNote",
  "order-line.modifiers",
  "order-line-option.quantity",
  "payment-attempt.method",
] as const;

export const bindingContract: Readonly<Record<string, readonly string[]>> = {
  "customer-home/home-hero": [
    "locationName=D restaurant-location.name read",
    "serviceOpen=D restaurant-location.serviceOpen read",
  ],
  "customer-home/home-categories": [
    "categoryName=D menu-category.name read",
    "categoryActive=D menu-category.active read",
  ],
  "customer-home/home-items": [
    "name=D menu-item.name read",
    "description=D menu-item.description read",
    "price=D menu-item.price read",
    "available=D menu-item.available read",
    "imageUrl=D menu-item.imageUrl read",
  ],
  "customer-menu/menu-categories": [
    "categoryName=D menu-category.name read",
    "categoryActive=D menu-category.active read",
  ],
  "customer-menu/menu-items": [
    "name=D menu-item.name read",
    "description=D menu-item.description read",
    "price=D menu-item.price read",
    "available=D menu-item.available read",
    "imageUrl=D menu-item.imageUrl read",
  ],
  "customer-dish-detail/dish-configurator": [
    "name=D menu-item.name read",
    "description=D menu-item.description read",
    "price=D menu-item.price read",
    "available=D menu-item.available read",
    "groupName=D menu-option-group.name read",
    "minimumSelections=D menu-option-group.minimumSelections read",
    "maximumSelections=D menu-option-group.maximumSelections read",
    "optionLabel=D menu-option.label read",
    "priceDelta=D menu-option.priceDelta read",
    "canAdd=P customer:order-line:create evaluate",
  ],
  "customer-cart/cart-lines": [
    "quantity=D order-line.quantity write",
    "lineNote=D order-line.lineNote write",
    "modifiers=D order-line.modifiers write",
    "unitPrice=D order-line.unitPrice read",
  ],
  "customer-cart/cart-summary": [
    "total=D order.total read",
    "status=D order.status read",
    "submit=F restaurant-order:cart:submit:submitted request",
    "canSubmit=P customer:order:submit evaluate",
  ],
  "customer-checkout/checkout-summary": [
    "total=D order.total read",
    "status=D order.status read",
  ],
  "customer-checkout/checkout-payment": [
    "method=D payment-attempt.method write",
    "paymentStatus=D order.paymentStatus read",
    "attemptStatus=D payment-attempt.status read",
    "amount=D payment-attempt.amount read",
    "pay=F restaurant-order:submitted:pay:paid request",
    "canPay=P customer:order:pay evaluate",
  ],
  "customer-orders/customer-order-list": [
    "status=D order.status read",
    "paymentStatus=D order.paymentStatus read",
    "priority=D order.priority read",
    "total=D order.total read",
  ],
  "customer-order-detail/customer-order-summary": [
    "total=D order.total read",
    "status=D order.status read",
    "fulfilmentType=D order.fulfilmentType read",
    "orderNote=D order.orderNote read",
  ],
  "customer-order-detail/customer-payment-state": [
    "paymentStatus=D order.paymentStatus read",
    "attemptStatus=D payment-attempt.status read",
    "amount=D payment-attempt.amount read",
  ],
  "customer-order-detail/customer-order-timeline": [
    "status=D order.status read",
    "submittedAt=D order.submittedAt read",
    "paidAt=D order.paidAt read",
  ],
  "customer-profile/customer-profile-form": [
    "subjectRef=D restaurant-principal.subjectRef read",
    "displayName=D restaurant-principal.displayName write",
    "email=D restaurant-principal.email read",
    "locale=D restaurant-principal.locale write",
    "marketingOptIn=D restaurant-principal.marketingOptIn write",
    "role=D restaurant-principal.role read",
  ],
  "merchant-dashboard/dashboard-metrics": [
    "orderTotal=D order.total read",
    "orderStatus=D order.status read",
    "tableStatus=D restaurant-table.status read",
    "menuAvailable=D menu-item.available read",
  ],
  "merchant-dashboard/dashboard-orders": [
    "status=D order.status read",
    "paymentStatus=D order.paymentStatus read",
    "priority=D order.priority read",
    "total=D order.total read",
  ],
  "merchant-dashboard/dashboard-tables": [
    "number=D restaurant-table.number read",
    "capacity=D restaurant-table.capacity read",
    "status=D restaurant-table.status read",
    "active=D restaurant-table.active read",
  ],
  "merchant-menu-management/merchant-menu-table": [
    "name=D menu-item.name write",
    "description=D menu-item.description write",
    "price=D menu-item.price write",
    "available=D menu-item.available write",
    "stock=D menu-item.stock read",
    "preparationMinutes=D menu-item.preparationMinutes write",
  ],
  "merchant-menu-management/merchant-availability": [
    "available=D menu-item.available write",
    "adjustInventory=F restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded request",
    "canAdjustInventory=P manager:inventory-ledger:record-manager-adjustment evaluate",
  ],
  "merchant-orders/merchant-order-list": [
    "status=D order.status read",
    "paymentStatus=D order.paymentStatus read",
    "priority=D order.priority write",
    "total=D order.total read",
  ],
  "merchant-orders/merchant-order-summary": [
    "total=D order.total read",
    "status=D order.status read",
    "orderNote=D order.orderNote read",
    "cancelSubmitted=F restaurant-order:submitted:cancel:cancelled request",
    "cancelPaid=F restaurant-order:paid:cancel:cancelled request",
    "canCancel=P manager:order:cancel evaluate",
  ],
  "merchant-orders/merchant-payment-state": [
    "paymentStatus=D order.paymentStatus read",
    "attemptStatus=D payment-attempt.status read",
    "amount=D payment-attempt.amount read",
    "pay=F restaurant-order:submitted:pay:paid request",
    "canPay=P cashier:order:pay evaluate",
  ],
  "merchant-kitchen-queue/kitchen-tickets": [
    "ticketStatus=D kitchen-ticket.status read",
    "priority=D kitchen-ticket.priority read",
    "acceptedAt=D kitchen-ticket.acceptedAt read",
    "startedAt=D kitchen-ticket.startedAt read",
    "readyAt=D kitchen-ticket.readyAt read",
    "accept=F restaurant-order:paid:accept:accepted request",
    "startPreparing=F restaurant-order:accepted:start-preparing:preparing request",
    "markReady=F restaurant-order:preparing:mark-ready:ready request",
    "canAccept=P kitchen:order:accept evaluate",
    "canStartPreparing=P kitchen:order:start-preparing evaluate",
    "canMarkReady=P kitchen:order:mark-ready evaluate",
  ],
  "merchant-tables/merchant-table-map": [
    "code=D restaurant-table.code write",
    "number=D restaurant-table.number write",
    "capacity=D restaurant-table.capacity write",
    "status=D restaurant-table.status read",
    "active=D restaurant-table.active write",
    "activate=F restaurant-table-session:open:activate:active request",
    "close=F restaurant-table-session:active:close:closed request",
    "expireOpen=F restaurant-table-session:open:expire:closed request",
    "expireActive=F restaurant-table-session:active:expire:closed request",
    "canActivate=P manager:table-session:activate evaluate",
    "canClose=P manager:table-session:close evaluate",
    "canExpire=P manager:table-session:expire evaluate",
  ],
  "merchant-users-roles/merchant-role-matrix": [
    "subjectRef=D restaurant-principal.subjectRef read",
    "displayName=D restaurant-principal.displayName read",
    "email=D restaurant-principal.email read",
    "role=D restaurant-principal.role read",
    "active=D restaurant-principal.active read",
    "canManage=P manager:restaurant-principal:update evaluate",
  ],
  "merchant-settings/restaurant-settings-form": [
    "name=D restaurant-location.name write",
    "currency=D restaurant-location.currency write",
    "taxRate=D restaurant-location.taxRate write",
    "serviceChargeRate=D restaurant-location.serviceChargeRate write",
    "timezone=D restaurant-location.timezone write",
    "logoUrl=D restaurant-location.logoUrl write",
    "serviceOpen=D restaurant-location.serviceOpen write",
    "canConfigure=P manager:restaurant-location:update evaluate",
  ],
};

export function restaurantProductFixture(): {
  intent: ProductIntentV1;
  experience: ExperienceBriefV1;
  baseDraft: DraftRevisionV1;
} {
  const requirementChecksum =
    "sha256:4cafea9d0a83bd84d27e4b29c6694af0456b7bc88758106276db18e23fbe7749";
  const intent = assertProductIntent({
    apiVersion: "factory.product-intent/v1",
    requirementChecksum,
    productType: "restaurant-ordering",
    title: "Maison Aurelia private dining",
    businessOutcome:
      "Guests place table orders while restaurant staff manage service safely.",
    actors: [
      {
        key: "customer",
        label: "Guest",
        goals: ["Discover dishes and place a table order."],
      },
      {
        key: "cashier",
        label: "Cashier",
        goals: ["Collect simulated payment and serve orders."],
      },
      {
        key: "kitchen",
        label: "Kitchen",
        goals: ["Prepare accepted orders in priority order."],
      },
      {
        key: "manager",
        label: "Manager",
        goals: ["Manage menu, tables, users, settings, and exceptions."],
      },
    ],
    coreJourneys: restaurantJourneyKeys.map((key) => ({
      key,
      actorKey: key.startsWith("customer") ? "customer" : "manager",
      outcome: `Complete ${key}.`,
      critical: true,
    })),
    constraints: {
      regulatedData: false,
      externalSideEffects: false,
      moneyMovement: "simulated",
    },
  });
  const experience = assertExperienceBrief({
    apiVersion: "factory.experience-brief/v1",
    requirementChecksum,
    surfaces: [
      {
        key: "customer-mobile",
        device: "mobile",
        audience: ["customer"],
        navigation: "bottom-tabs",
        density: "comfortable",
      },
      {
        key: "merchant-desktop",
        device: "desktop",
        audience: ["cashier", "kitchen", "manager"],
        navigation: "sidebar",
        density: "compact",
      },
    ],
    brand: {
      qualities: ["refined", "warm", "private"],
      contrast: "balanced",
      imagery: "image-led",
    },
    theme: { defaultMode: "light", supportsDark: true },
    responsiveTargets: ["mobile", "tablet", "desktop"],
  });
  const base = composeDefaultCapabilityDraft({
    profile: "restaurant-ordering",
  });
  return {
    intent,
    experience,
    baseDraft: createDraftRevision(base.graph, "restaurant-ordering-draft"),
  };
}

export function normalizedBindingPolicies(
  graph: ApplicationGraphV3,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const policy of graph.bindingPolicies) {
    const key = `${policy.pageId}/${policy.blockId}`;
    const prefix = `${policy.bindingKey}=`;
    const value =
      policy.kind === "domain-field"
        ? `${prefix}D ${policy.entityKey}.${policy.fieldKey} ${policy.access}`
        : policy.kind === "flow-transition"
          ? `${prefix}F ${policy.flowKey}:${policy.from}:${policy.event}:${policy.to} ${policy.access}`
          : `${prefix}P ${policy.roleKey}:${policy.resource}:${policy.action} ${policy.access}`;
    (result[key] ??= []).push(value);
  }
  return result;
}
