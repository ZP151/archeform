import {
  assertExactData,
  deepFreeze,
  interactionStates,
  uiPrimitiveRegistry,
  validateUiPrimitiveRegistry,
  type CopyableSource,
  type InteractionState,
  type StateFixture,
  type UiPrimitive,
} from "@factory/ui-primitives";
import {
  uiPatternRegistry,
  validateUiPatternRegistry,
  type UiPattern,
} from "@factory/ui-patterns";

export const registryStates = interactionStates;
export type BindingPort = string;
export type GeneratedUiItem = {
  readonly key: string;
  readonly version: "1.0.0";
  readonly kind: "layout" | "business-block";
  readonly slots: readonly string[];
  readonly ports: readonly BindingPort[];
  readonly composition: {
    readonly patternKeys: readonly string[];
    readonly primitiveKeys: readonly string[];
  };
  readonly states: readonly InteractionState[];
  readonly responsive: readonly ["mobile", "tablet", "desktop"];
  readonly fixture: { readonly id: string; readonly state: "confirmation" };
  readonly fixtures: readonly StateFixture[];
  readonly accessibility: {
    readonly landmark: string;
    readonly keyboard: readonly string[];
    readonly focus: string;
    readonly liveRegion: "polite";
  };
  readonly source: CopyableSource;
  readonly styleOnlyDuplicateOf?: string;
};

const blockPorts: Readonly<Record<string, readonly string[]>> = {
  "mobile-product-shell": [],
  "merchant-workspace-shell": [],
  "menu-hero": ["locationName", "serviceOpen"],
  "category-rail": ["categoryName", "categoryActive"],
  "menu-item-card": ["name", "description", "price", "available", "imageUrl"],
  "dish-configurator": [
    "name",
    "description",
    "price",
    "available",
    "groupName",
    "minimumSelections",
    "maximumSelections",
    "optionLabel",
    "priceDelta",
    "canAdd",
  ],
  "cart-line": ["quantity", "lineNote", "modifiers", "unitPrice"],
  "order-summary": [
    "total",
    "status",
    "fulfilmentType",
    "orderNote",
    "submit",
    "canSubmit",
    "cancelSubmitted",
    "cancelPaid",
    "canCancel",
  ],
  "payment-state": [
    "method",
    "paymentStatus",
    "attemptStatus",
    "amount",
    "pay",
    "canPay",
  ],
  "order-timeline": ["status", "submittedAt", "paidAt"],
  "metric-card": ["orderTotal", "orderStatus", "tableStatus", "menuAvailable"],
  "active-order-list": ["status", "paymentStatus", "priority", "total"],
  "kitchen-ticket": [
    "ticketStatus",
    "priority",
    "acceptedAt",
    "startedAt",
    "readyAt",
    "accept",
    "startPreparing",
    "markReady",
    "canAccept",
    "canStartPreparing",
    "canMarkReady",
  ],
  "table-map": [
    "code",
    "number",
    "capacity",
    "status",
    "active",
    "activate",
    "close",
    "expireOpen",
    "expireActive",
    "canActivate",
    "canClose",
    "canExpire",
  ],
  "menu-management-table": [
    "name",
    "description",
    "price",
    "available",
    "stock",
    "preparationMinutes",
  ],
  "availability-toggle": ["available", "adjustInventory", "canAdjustInventory"],
  "role-matrix": [
    "subjectRef",
    "displayName",
    "email",
    "role",
    "active",
    "canManage",
  ],
  "customer-profile-form": [
    "subjectRef",
    "displayName",
    "email",
    "locale",
    "marketingOptIn",
    "role",
  ],
  "restaurant-settings-form": [
    "name",
    "currency",
    "taxRate",
    "serviceChargeRate",
    "timezone",
    "logoUrl",
    "serviceOpen",
    "canConfigure",
  ],
};

const layouts = new Set(["mobile-product-shell", "merchant-workspace-shell"]);
const formKeys = new Set([
  "dish-configurator",
  "payment-state",
  "customer-profile-form",
  "restaurant-settings-form",
]);
const tableKeys = new Set(["menu-management-table", "role-matrix"]);
const navigationKeys = new Set(["category-rail"]);

const titleFor = (key: string) =>
  key
    .replaceAll("-", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const functionName = (key: string) =>
  key.replace(/(^|-)([a-z])/g, (_match, _separator, letter: string) =>
    letter.toUpperCase(),
  );
const fixturesFor = (key: string): readonly StateFixture[] =>
  interactionStates.map((state) => ({ id: `${key}-${state}`, state }));

const sourceIdentifier = (key: string) => key.replaceAll("-", "_");

const sourcePrelude = (key: string): string => {
  const id = sourceIdentifier(key);
  return `const ${id}EscapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const ${id}SanitizeInput = (value) => Array.isArray(value) ? value.map(${id}SanitizeInput) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, ${id}SanitizeInput(child)])) : typeof value === "string" ? ${id}EscapeHtml(value) : value;
const ${id}SafeUrl = (value) => { const url = String(value ?? "").trim(); const lower = url.toLowerCase(); return url.startsWith("/") || url.startsWith("#") || url.startsWith("?") || lower.startsWith("http://") || lower.startsWith("https://") ? ${id}EscapeHtml(url) : "#"; };
const ${id}StateViews = Object.freeze({
  loading: '<section role="status" aria-live="polite" aria-busy="true">Loading</section>',
  empty: '<section role="status" aria-live="polite"><h2>Nothing here yet</h2><p>No content is available.</p></section>',
  validation: '<section role="status" aria-live="polite"><p>Check the highlighted values.</p></section>',
  error: '<section role="alert"><p>Something went wrong.</p><button type="button">Try again</button></section>',
  confirmation: '',
  denial: '<section role="alert"><h2>Access denied</h2><p>You do not have permission.</p></section>'
});`;
};

const bodyFor = (key: string): string => {
  if (key === "mobile-product-shell") {
    return '<main class="factory-screen mobile-shell" aria-label="Restaurant application"><header><h1>${input.title ?? "Restaurant"}</h1></header><section id="content" tabindex="-1">${trustedContent}</section>${trustedNavigation}</main>';
  }
  if (key === "merchant-workspace-shell") {
    return '<main class="factory-screen merchant-shell" aria-label="Restaurant workspace">${trustedNavigation}<section id="content" tabindex="-1">${trustedContent}</section></main>';
  }
  const templates: Readonly<Record<string, string>> = {
    "menu-hero":
      '<header class="factory-block" aria-labelledby="menu-hero-title"><p>${input.serviceOpen ? "Open for service" : "Closed"}</p><h2 id="menu-hero-title">${input.locationName ?? "Restaurant"}</h2></header>',
    "category-rail":
      '<nav class="factory-block" aria-label="Menu categories"><button type="button" aria-pressed="${Boolean(input.categoryActive)}">${input.categoryName ?? "Category"}</button></nav>',
    "menu-item-card":
      '<article class="factory-block" aria-labelledby="menu-item-title"><img src="${safeImageUrl}" alt="" /><h2 id="menu-item-title">${input.name ?? "Menu item"}</h2><p>${input.description ?? ""}</p><output aria-label="Price">${input.price ?? ""}</output><button type="button" ${input.available ? "" : "disabled"}>View dish</button></article>',
    "dish-configurator":
      '<form class="factory-block" aria-labelledby="dish-title"><h2 id="dish-title">${input.name ?? "Dish"}</h2><p>${input.description ?? ""}</p><output aria-label="Price">${input.price ?? ""}</output><fieldset><legend>${input.groupName ?? "Options"}</legend><label>${input.optionLabel ?? "Option"}<select name="option" required data-minimum="${input.minimumSelections ?? 0}" data-maximum="${input.maximumSelections ?? 1}"><option>${input.optionLabel ?? "Option"} ${input.priceDelta ?? ""}</option></select></label></fieldset><button type="submit" data-policy="${String(input.canAdd)}" ${input.canAdd && input.available !== false ? "" : "disabled"}>Add to order</button></form>',
    "cart-line":
      '<form class="factory-block" aria-labelledby="cart-line-title"><h2 id="cart-line-title">Cart item</h2><label>Quantity<input name="quantity" type="number" min="1" value="${input.quantity ?? 1}" /></label><label>Note<textarea name="lineNote">${input.lineNote ?? ""}</textarea></label><p>Modifiers: ${input.modifiers ?? "None"}</p><output aria-label="Unit price">${input.unitPrice ?? ""}</output></form>',
    "order-summary":
      '<article class="factory-block" aria-labelledby="order-summary-title"><h2 id="order-summary-title">Order summary</h2><output aria-label="Total">${input.total ?? ""}</output><p>Status: ${input.status ?? ""}</p><p>Fulfilment: ${input.fulfilmentType ?? ""}</p><p>Note: ${input.orderNote ?? ""}</p><button type="button" data-transition="${input.submit ?? ""}" data-policy="${String(input.canSubmit)}" ${input.canSubmit ? "" : "disabled"}>Submit order</button><button type="button" data-transition="${input.cancelSubmitted ?? ""}" data-policy="${String(input.canCancel)}" ${input.canCancel ? "" : "disabled"}>Cancel submitted order</button><button type="button" data-transition="${input.cancelPaid ?? ""}" data-policy="${String(input.canCancel)}" ${input.canCancel ? "" : "disabled"}>Cancel paid order</button></article>',
    "payment-state":
      '<form class="factory-block" aria-labelledby="payment-title"><h2 id="payment-title">Payment</h2><label>Method<select name="method"><option>${input.method ?? "card"}</option></select></label><p>Payment status: ${input.paymentStatus ?? ""}</p><p>Attempt status: ${input.attemptStatus ?? ""}</p><output aria-label="Amount">${input.amount ?? ""}</output><button type="submit" data-transition="${input.pay ?? ""}" data-policy="${String(input.canPay)}" ${input.canPay ? "" : "disabled"}>Pay</button></form>',
    "order-timeline":
      '<section class="factory-block" aria-labelledby="timeline-title"><h2 id="timeline-title">Order timeline</h2><ol><li>Status: ${input.status ?? ""}</li><li>Submitted: ${input.submittedAt ?? ""}</li><li>Paid: ${input.paidAt ?? ""}</li></ol></section>',
    "metric-card":
      '<article class="factory-block" aria-labelledby="metrics-title"><h2 id="metrics-title">Service metrics</h2><dl><dt>Order total</dt><dd>${input.orderTotal ?? ""}</dd><dt>Order status</dt><dd>${input.orderStatus ?? ""}</dd><dt>Table status</dt><dd>${input.tableStatus ?? ""}</dd><dt>Menu availability</dt><dd>${input.menuAvailable ?? ""}</dd></dl></article>',
    "active-order-list":
      '<section class="factory-block" aria-labelledby="active-orders-title"><h2 id="active-orders-title">Active orders</h2><ul aria-live="polite"><li><span>${input.status ?? ""}</span><span>${input.paymentStatus ?? ""}</span><span>${input.priority ?? ""}</span><output>${input.total ?? ""}</output></li></ul></section>',
    "kitchen-ticket":
      '<article class="factory-block" aria-labelledby="ticket-title"><h2 id="ticket-title">Kitchen ticket</h2><p>Status: ${input.ticketStatus ?? ""}</p><p>Priority: ${input.priority ?? ""}</p><ol><li>Accepted: ${input.acceptedAt ?? ""}</li><li>Started: ${input.startedAt ?? ""}</li><li>Ready: ${input.readyAt ?? ""}</li></ol><button type="button" data-transition="${input.accept ?? ""}" data-policy="${String(input.canAccept)}" ${input.canAccept ? "" : "disabled"}>Accept order</button><button type="button" data-transition="${input.startPreparing ?? ""}" data-policy="${String(input.canStartPreparing)}" ${input.canStartPreparing ? "" : "disabled"}>Start preparing</button><button type="button" data-transition="${input.markReady ?? ""}" data-policy="${String(input.canMarkReady)}" ${input.canMarkReady ? "" : "disabled"}>Mark ready</button></article>',
    "table-map":
      '<section class="factory-block" aria-labelledby="table-map-title"><h2 id="table-map-title">Table ${input.number ?? ""}</h2><p>Code: ${input.code ?? ""}</p><p>Capacity: ${input.capacity ?? ""}</p><p>Status: ${input.status ?? ""}</p><button type="button" role="switch" aria-checked="${Boolean(input.active)}">Table active</button><button type="button" data-transition="${input.activate ?? ""}" data-policy="${String(input.canActivate)}" ${input.canActivate ? "" : "disabled"}>Activate table</button><button type="button" data-transition="${input.close ?? ""}" data-policy="${String(input.canClose)}" ${input.canClose ? "" : "disabled"}>Close table</button><button type="button" data-transition="${input.expireOpen ?? ""}" data-policy="${String(input.canExpire)}" ${input.canExpire ? "" : "disabled"}>Expire open session</button><button type="button" data-transition="${input.expireActive ?? ""}" data-policy="${String(input.canExpire)}" ${input.canExpire ? "" : "disabled"}>Expire active session</button></section>',
    "menu-management-table":
      '<table class="factory-block"><caption>Menu management</caption><thead><tr><th>Name</th><th>Description</th><th>Price</th><th>Available</th><th>Stock</th><th>Preparation</th></tr></thead><tbody><tr><td><input name="name" value="${input.name ?? ""}" /></td><td><input name="description" value="${input.description ?? ""}" /></td><td><input name="price" value="${input.price ?? ""}" /></td><td><input name="available" type="checkbox" ${input.available ? "checked" : ""} /></td><td>${input.stock ?? ""}</td><td><input name="preparationMinutes" type="number" value="${input.preparationMinutes ?? ""}" /></td></tr></tbody></table>',
    "availability-toggle":
      '<section class="factory-block" aria-labelledby="availability-title"><h2 id="availability-title">Availability</h2><button type="button" role="switch" aria-checked="${Boolean(input.available)}" data-transition="${input.adjustInventory ?? ""}" data-policy="${String(input.canAdjustInventory)}" ${input.canAdjustInventory ? "" : "disabled"}>Update availability</button></section>',
    "role-matrix":
      '<table class="factory-block"><caption>User roles</caption><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Action</th></tr></thead><tbody><tr data-subject="${input.subjectRef ?? ""}"><td>${input.displayName ?? ""}</td><td>${input.email ?? ""}</td><td>${input.role ?? ""}</td><td>${input.active ?? ""}</td><td><button type="button" data-policy="${String(input.canManage)}" ${input.canManage ? "" : "disabled"}>Manage role</button></td></tr></tbody></table>',
    "customer-profile-form":
      '<form class="factory-block" aria-labelledby="profile-title"><h2 id="profile-title">Customer profile</h2><input name="subjectRef" type="hidden" value="${input.subjectRef ?? ""}" /><label>Display name<input name="displayName" value="${input.displayName ?? ""}" /></label><label>Email<input name="email" type="email" value="${input.email ?? ""}" readonly /></label><label>Locale<select name="locale"><option>${input.locale ?? "en"}</option></select></label><button type="button" role="switch" aria-checked="${Boolean(input.marketingOptIn)}">Marketing preferences</button><output aria-label="Role">${input.role ?? ""}</output><button type="submit">Save profile</button></form>',
    "restaurant-settings-form":
      '<form class="factory-block" aria-labelledby="settings-title"><h2 id="settings-title">Restaurant settings</h2><label>Name<input name="name" value="${input.name ?? ""}" /></label><label>Currency<select name="currency"><option>${input.currency ?? ""}</option></select></label><label>Tax rate<input name="taxRate" type="number" value="${input.taxRate ?? ""}" /></label><label>Service charge<input name="serviceChargeRate" type="number" value="${input.serviceChargeRate ?? ""}" /></label><label>Timezone<select name="timezone"><option>${input.timezone ?? ""}</option></select></label><label>Logo URL<input name="logoUrl" type="url" value="${safeLogoUrl}" /></label><button type="button" role="switch" aria-checked="${Boolean(input.serviceOpen)}">Service open</button><button type="submit" data-policy="${String(input.canConfigure)}" ${input.canConfigure ? "" : "disabled"}>Save settings</button></form>',
  };
  const template = templates[key];
  if (!template) throw new Error(`No generated source template for '${key}'.`);
  return template;
};

const sourceFor = (key: string, ports: readonly string[]): CopyableSource => ({
  ownership: "factory-authored",
  license: "UNLICENSED",
  code: [
    sourcePrelude(key),
    `export function render${functionName(key)}(input = {}, state = "confirmation") {`,
    `  if (typeof state !== "string" || !Object.hasOwn(${sourceIdentifier(key)}StateViews, state)) throw new Error("Unknown ${key} state.");`,
    ...(layouts.has(key)
      ? [
          `  const trustedContent = typeof input.content === "string" ? input.content : "";`,
          `  const trustedNavigation = typeof input.navigation === "string" ? input.navigation : "";`,
        ]
      : []),
    ...(key === "menu-item-card"
      ? [
          `  const safeImageUrl = ${sourceIdentifier(key)}SafeUrl(input.imageUrl);`,
        ]
      : []),
    ...(key === "restaurant-settings-form"
      ? [
          `  const safeLogoUrl = ${sourceIdentifier(key)}SafeUrl(input.logoUrl);`,
        ]
      : []),
    `  input = ${sourceIdentifier(key)}SanitizeInput(input);`,
    `  if (state !== "confirmation") return ${sourceIdentifier(key)}StateViews[state];`,
    `  return \`${bodyFor(key)}\`;`,
    `}`,
    `export const ${sourceIdentifier(key)}Styles = \`.factory-block:focus-visible,.factory-screen:focus-visible{outline:3px solid currentColor;outline-offset:3px}@media(max-width:640px){.factory-block,.factory-screen{width:100%;display:block}}@media(min-width:641px) and (max-width:1024px){.factory-block,.factory-screen{max-width:48rem}}@media(min-width:1025px){.factory-block,.factory-screen{max-width:80rem}}@media(prefers-reduced-motion:reduce){.factory-block,.factory-screen{animation:none;transition:none;scroll-behavior:auto}}\`;`,
  ].join("\n"),
});

const compositionFor = (key: string, kind: "layout" | "business-block") => {
  if (kind === "layout") {
    return {
      patternKeys: [
        key === "mobile-product-shell"
          ? "bottom-tab-navigation"
          : "compact-sidebar-navigation",
      ],
      primitiveKeys: ["button", "badge"],
    };
  }
  if (formKeys.has(key))
    return {
      patternKeys: ["form-field", "validation-state", "error-state"],
      primitiveKeys: ["label", "input", "button"],
    };
  if (tableKeys.has(key))
    return {
      patternKeys: ["data-table", "loading-state", "empty-state"],
      primitiveKeys: ["table", "button", "skeleton"],
    };
  return {
    patternKeys: [
      "loading-state",
      "empty-state",
      "error-state",
      "confirmation-state",
      "denial-state",
    ],
    primitiveKeys: ["card", "button", "badge", "skeleton"],
  };
};

const registry = Object.entries(blockPorts).map(
  ([key, ports]): GeneratedUiItem => {
    const kind = layouts.has(key) ? "layout" : "business-block";
    return {
      key,
      version: "1.0.0",
      kind,
      slots:
        kind === "layout"
          ? ["navigation", "content"]
          : ["heading", "content", "actions", "status"],
      ports: [...ports],
      composition: compositionFor(key, kind),
      states: [...interactionStates],
      responsive: ["mobile", "tablet", "desktop"],
      fixture: { id: `${key}-default`, state: "confirmation" },
      fixtures: fixturesFor(key),
      accessibility: {
        landmark:
          kind === "layout"
            ? "main"
            : formKeys.has(key)
              ? "form"
              : tableKeys.has(key)
                ? "table"
                : "section",
        keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"],
        focus:
          "visible focus ring; dialogs restore focus; errors move focus to the status summary",
        liveRegion: "polite",
      },
      source: sourceFor(key, ports),
    };
  },
);

export const generatedUiRegistry: readonly GeneratedUiItem[] =
  deepFreeze(registry);

export function selectCopyableSource(keys: readonly string[]): string {
  return [...new Set(keys)]
    .map((key) => {
      const item = generatedUiRegistry.find(
        (candidate) => candidate.key === key,
      );
      if (!item) throw new Error(`Unknown registry key '${key}'.`);
      if (item.source.code.includes("@factory/"))
        throw new Error(
          `Generated source '${key}' contains a private workspace import.`,
        );
      return item.source.code;
    })
    .join("\n");
}

export function validateGeneratedUiClosure(
  patterns: readonly UiPattern[] = uiPatternRegistry,
  primitives: readonly UiPrimitive[] = uiPrimitiveRegistry,
): true {
  validateUiPatternRegistry(patterns);
  validateUiPrimitiveRegistry(primitives);
  const patternKeys = new Set(patterns.map(({ key }) => key));
  const primitiveKeys = new Set(primitives.map(({ key }) => key));
  for (const item of generatedUiRegistry) {
    for (const key of item.composition.patternKeys) {
      if (!patternKeys.has(key))
        throw new Error(`Generated UI pattern closure is missing '${key}'.`);
    }
    for (const key of item.composition.primitiveKeys) {
      if (!primitiveKeys.has(key))
        throw new Error(`Generated UI primitive closure is missing '${key}'.`);
    }
  }
  return true;
}

export function validateGeneratedUiRegistry(
  items: readonly GeneratedUiItem[],
): true {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.styleOnlyDuplicateOf)
      throw new Error("Style-only duplicate generated UI is not allowed.");
    if (keys.has(item.key))
      throw new Error(`Duplicate generated UI key '${item.key}'.`);
    keys.add(item.key);
  }
  assertExactData(items, generatedUiRegistry, "Generated UI registry");
  return validateGeneratedUiClosure();
}
