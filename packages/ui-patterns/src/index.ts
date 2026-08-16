import {
  assertExactData,
  deepFreeze,
  interactionStates,
  uiPrimitiveRegistry,
  type CopyableSource,
  type InteractionState,
  type StateFixture,
} from "@factory/ui-primitives";

export type UiPattern = {
  readonly key: string;
  readonly version: "1.0.0";
  readonly slots: readonly string[];
  readonly primitives: readonly string[];
  readonly states: readonly InteractionState[];
  readonly fixtures: readonly StateFixture[];
  readonly accessibility: {
    readonly keyboard: readonly string[];
    readonly landmark: string;
    readonly focus: string;
  };
  readonly fixture: { readonly id: string; readonly state: "confirmation" };
  readonly source: CopyableSource;
  readonly styleOnlyDuplicateOf?: string;
};

const primitiveKeys = new Set(uiPrimitiveRegistry.map(({ key }) => key));
const fixturesFor = (key: string): readonly StateFixture[] =>
  interactionStates.map((state) => ({ id: `${key}-${state}`, state }));

const sourceIdentifier = (key: string) => key.replaceAll("-", "_");

const safeInputSource = (key: string): string => {
  const id = sourceIdentifier(key);
  return `const ${id}EscapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const ${id}SafeUrl = (value) => { const url = String(value ?? "").trim(); const lower = url.toLowerCase(); return url.startsWith("/") || url.startsWith("#") || url.startsWith("?") || lower.startsWith("http://") || lower.startsWith("https://") ? ${id}EscapeHtml(url) : "#"; };
const ${id}SanitizeInput = (value, field = "") => Array.isArray(value) ? value.map((child) => ${id}SanitizeInput(child, field)) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, ${id}SanitizeInput(child, childKey)])) : typeof value === "string" ? /(?:href|url)$/i.test(field) ? ${id}SafeUrl(value) : ${id}EscapeHtml(value) : value;`;
};

const keyboardSource = (key: string): string => {
  if (key !== "bottom-tab-navigation" && key !== "compact-sidebar-navigation")
    return "";
  const functionName =
    key === "bottom-tab-navigation"
      ? "handlePatternKeyDown"
      : "handleCompactSidebarKeyDown";
  const id = sourceIdentifier(key);
  return `export function ${functionName}(event, index, count) {
  if (!Number.isInteger(count) || count < 1) return index;
  const ${id}Moves = Object.freeze({ ArrowRight: (index + 1) % count, ArrowDown: (index + 1) % count, ArrowLeft: (index - 1 + count) % count, ArrowUp: (index - 1 + count) % count, Home: 0, End: count - 1 });
  if (typeof event.key !== "string" || !Object.hasOwn(${id}Moves, event.key)) return index;
  event.preventDefault();
  return ${id}Moves[event.key];
}`;
};

const patternStateSource = (key: string): string => {
  const id = sourceIdentifier(key);
  return `const ${id}StateViews = Object.freeze({
  loading: '<section role="status" aria-live="polite" aria-busy="true">Loading</section>',
  empty: '<section role="status" aria-live="polite"><h2>Nothing here yet</h2><p>No content is available.</p></section>',
  validation: '<section role="status" aria-live="polite"><p>Check the highlighted values.</p></section>',
  error: '<section role="alert"><p>Something went wrong.</p><button type="button">Try again</button></section>',
  confirmation: '',
  denial: '<section role="alert"><h2>Access denied</h2><p>You do not have permission.</p></section>'
});`;
};

const patternSourceFor = (key: string): string => {
  const source = sourceByKey[key]!;
  const functionMatch = /export function (\w+)/.exec(source);
  if (!functionMatch)
    throw new Error(`Pattern '${key}' has no copyable renderer.`);
  const functionName = functionMatch[1]!;
  const id = sourceIdentifier(key);
  const confirmationRenderer = source.replace(
    `export function ${functionName}`,
    `function ${id}RenderConfirmation`,
  );
  return `${safeInputSource(key)}
${patternStateSource(key)}
${confirmationRenderer}
export function ${functionName}(input = {}, state = "confirmation") {
  if (typeof state !== "string" || !Object.hasOwn(${id}StateViews, state)) throw new Error("Unknown ${key} state.");
  input = ${id}SanitizeInput(input);
  if (state !== "confirmation") return ${id}StateViews[state];
  return ${id}RenderConfirmation(input, state);
}
${keyboardSource(key)}
export const ${id}Styles = \`.factory-pattern:focus-visible{outline:3px solid currentColor}@media(max-width:640px){.factory-pattern{width:100%}}@media(min-width:641px){.factory-pattern{width:auto}}@media(prefers-reduced-motion:reduce){.factory-pattern{animation:none;scroll-behavior:auto}}\`;`;
};

const sourceByKey: Readonly<Record<string, string>> = {
  "bottom-tab-navigation":
    'export function renderBottomTabs(input = {}) { return `<nav aria-label="Primary navigation"><div role="tablist">${(input.items ?? []).map((item, index) => `<button role="tab" aria-selected="${item.current}" tabindex="${index === 0 ? 0 : -1}"><i data-lucide="${item.icon ?? "circle"}" aria-hidden="true"></i>${item.label}</button>`).join("")}</div></nav>`; }',
  "compact-sidebar-navigation":
    'export function renderCompactSidebar(input = {}) { return `<nav aria-label="Merchant navigation"><ul>${(input.items ?? []).map((item) => `<li><a href="${item.href}" aria-current="${item.current ? "page" : "false"}"><i data-lucide="${item.icon ?? "circle"}" aria-hidden="true"></i>${item.label}</a></li>`).join("")}</ul></nav>`; }',
  "form-field":
    'export function renderFormField(input = {}, state = "confirmation") { return `<label>${input.label ?? "Field"}<input name="${input.name ?? "field"}" aria-invalid="${state === "validation" || state === "error"}" aria-describedby="field-message" /><span id="field-message" role="status">${input.message ?? state}</span></label>`; }',
  "confirmation-dialog":
    'export function renderConfirmationDialog(input = {}) { return `<dialog open aria-modal="true" aria-labelledby="confirmation-title"><h2 id="confirmation-title">${input.title ?? "Confirm action"}</h2><p>${input.description ?? "Review this action."}</p><button type="button">${input.confirmLabel ?? "Confirm"}</button><button type="button">Cancel</button></dialog>`; }',
  "data-table":
    'export function renderDataTable(input = {}) { return `<table><caption>${input.caption ?? "Data"}</caption><thead><tr>${(input.columns ?? []).map((column) => `<th scope="col">${column}</th>`).join("")}</tr></thead><tbody>${(input.rows ?? []).map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`; }',
  "loading-state":
    'export function renderLoadingState(input = {}) { return `<section role="status" aria-live="polite" aria-busy="true"><span class="skeleton"></span><span class="sr-only">${input.label ?? "Loading"}</span></section>`; }',
  "empty-state":
    'export function renderEmptyState(input = {}) { return `<section role="status" aria-labelledby="empty-title"><h2 id="empty-title">${input.title ?? "Nothing here yet"}</h2><p>${input.description ?? "No content is available."}</p><button type="button">${input.action ?? "Continue"}</button></section>`; }',
  "validation-state":
    'export function renderValidationState(input = {}) { return `<p role="status" aria-live="polite">${input.message ?? "Check the highlighted values."}</p>`; }',
  "error-state":
    'export function renderErrorState(input = {}) { return `<section role="alert"><p>${input.message ?? "Something went wrong."}</p><button type="button">${input.retry ?? "Try again"}</button></section>`; }',
  "confirmation-state":
    'export function renderConfirmationState(input = {}) { return `<output role="status" aria-live="polite">${input.message ?? "Saved"}</output>`; }',
  "denial-state":
    'export function renderDenialState(input = {}) { return `<section role="alert"><h2>${input.title ?? "Access denied"}</h2><p>${input.message ?? "You do not have permission."}</p></section>`; }',
};

const patternDefinitions = [
  [
    "bottom-tab-navigation",
    ["items"],
    ["button", "badge"],
    "navigation",
    ["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"],
  ],
  [
    "compact-sidebar-navigation",
    ["items"],
    ["button", "badge"],
    "navigation",
    ["Tab", "ArrowUp", "ArrowDown", "Home", "End", "Enter"],
  ],
  [
    "form-field",
    ["label", "control", "message"],
    ["label", "input"],
    "group",
    ["Tab", "Shift+Tab"],
  ],
  [
    "confirmation-dialog",
    ["title", "description", "actions"],
    ["dialog", "button"],
    "dialog",
    ["Tab", "Shift+Tab", "Escape", "Enter"],
  ],
  [
    "data-table",
    ["columns", "rows"],
    ["table", "skeleton"],
    "table",
    ["Tab", "ArrowUp", "ArrowDown"],
  ],
  ["loading-state", ["label"], ["skeleton"], "status", []],
  [
    "empty-state",
    ["title", "description", "action"],
    ["card", "button"],
    "status",
    ["Tab", "Enter"],
  ],
  ["validation-state", ["message"], ["badge"], "status", []],
  [
    "error-state",
    ["message", "retry"],
    ["badge", "button"],
    "alert",
    ["Tab", "Enter"],
  ],
  ["confirmation-state", ["message"], ["badge"], "status", []],
  ["denial-state", ["message"], ["badge"], "alert", []],
] as const;

const registry = patternDefinitions.map(
  ([key, slots, primitives, landmark, keyboard]): UiPattern => ({
    key,
    version: "1.0.0",
    slots: [...slots],
    primitives: [...primitives],
    states: [...interactionStates],
    fixtures: fixturesFor(key),
    accessibility: {
      keyboard: [...keyboard],
      landmark,
      focus:
        "visible focus ring; composite focus follows the documented arrow-key order",
    },
    fixture: { id: `${key}-default`, state: "confirmation" },
    source: {
      ownership: "factory-authored",
      license: "UNLICENSED",
      code: patternSourceFor(key),
    },
  }),
);

export const uiPatternRegistry: readonly UiPattern[] = deepFreeze(registry);

export function findUiPattern(key: string): UiPattern {
  const item = uiPatternRegistry.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Unknown pattern key '${key}'.`);
  return item;
}

export function validateUiPatternRegistry(items: readonly UiPattern[]): true {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.styleOnlyDuplicateOf)
      throw new Error("Style-only duplicate patterns are not allowed.");
    if (keys.has(item.key))
      throw new Error(`Duplicate pattern key '${item.key}'.`);
    keys.add(item.key);
    for (const primitive of item.primitives) {
      if (!primitiveKeys.has(primitive))
        throw new Error(`Unknown primitive '${primitive}'.`);
    }
  }
  return assertExactData(items, uiPatternRegistry, "UI pattern registry");
}
