export const interactionStates = [
  "loading",
  "empty",
  "validation",
  "error",
  "confirmation",
  "denial",
] as const;

export type InteractionState = (typeof interactionStates)[number];
export type StateFixture = {
  readonly id: string;
  readonly state: InteractionState;
};
export type CopyableSource = {
  readonly ownership: "factory-authored";
  readonly license: "UNLICENSED";
  readonly code: string;
};
export type UiPrimitive = {
  readonly key: string;
  readonly version: "1.0.0";
  readonly states: readonly InteractionState[];
  readonly fixtures: readonly StateFixture[];
  readonly responsive: readonly ["mobile", "tablet", "desktop"];
  readonly iconPolicy: "lucide-only";
  readonly accessibility: {
    readonly role: string;
    readonly keyboard: readonly string[];
    readonly focus: string;
  };
  readonly source: CopyableSource;
};

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function exactDataEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left) ||
      !Array.isArray(right) ||
      left.length !== right.length
    ) {
      return false;
    }
    return left.every((item, index) => exactDataEqual(item, right[index]));
  }
  if (
    Object.getPrototypeOf(left) !== Object.prototype ||
    Object.getPrototypeOf(right) !== Object.prototype
  ) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key, index) =>
      key === rightKeys[index] &&
      exactDataEqual(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
  );
}

export function assertExactData(
  actual: unknown,
  expected: unknown,
  label: string,
): true {
  if (!exactDataEqual(actual, expected)) {
    throw new Error(`${label} must equal the exact frozen manifest.`);
  }
  return true;
}

const primitiveDefinitions = [
  [
    "button",
    "button",
    ["Tab", "Shift+Tab", "Enter", "Space"],
    '<button class="factory-ui" type="button" aria-busy="${state === \'loading\'}" ${state === "denial" ? "disabled" : ""}>${input.label ?? "Action"}</button>',
  ],
  [
    "input",
    "textbox",
    ["Tab", "Shift+Tab"],
    '<label class="factory-ui">${input.label ?? "Field"}<input value="${input.value ?? ""}" aria-invalid="${state === \'validation\' || state === \'error\'}" aria-describedby="input-message" /><span id="input-message" role="status">${message}</span></label>',
  ],
  [
    "label",
    "label",
    ["No direct keyboard interaction"],
    '<label class="factory-ui" for="${input.for ?? "field"}">${input.text ?? "Field label"}</label>',
  ],
  [
    "select",
    "combobox",
    ["Tab", "ArrowUp", "ArrowDown", "Enter", "Escape"],
    '<label class="factory-ui">${input.label ?? "Choose"}<select aria-describedby="select-message">${(input.options ?? []).map((option) => `<option>${option}</option>`).join("")}</select><span id="select-message" role="status">${message}</span></label>',
  ],
  [
    "checkbox",
    "checkbox",
    ["Tab", "Space"],
    '<label class="factory-ui"><input type="checkbox" ${input.checked ? "checked" : ""} />${input.label ?? "Option"}<span role="status">${message}</span></label>',
  ],
  [
    "switch",
    "switch",
    ["Tab", "Space"],
    '<button class="factory-ui" type="button" role="switch" aria-checked="${Boolean(input.checked)}">${input.label ?? "Toggle"}</button>',
  ],
  [
    "dialog",
    "dialog",
    ["Tab", "Shift+Tab", "Escape"],
    '<dialog class="factory-ui" aria-modal="true" aria-labelledby="dialog-title" open><h2 id="dialog-title">${input.title ?? "Confirmation"}</h2><p>${message}</p><button type="button">${input.confirmLabel ?? "Confirm"}</button></dialog>',
  ],
  [
    "drawer",
    "dialog",
    ["Tab", "Shift+Tab", "Escape"],
    '<aside class="factory-ui" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><h2 id="drawer-title">${input.title ?? "Details"}</h2><p role="status">${message}</p><button type="button" aria-label="Close drawer">Close</button></aside>',
  ],
  [
    "tabs",
    "tablist",
    ["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"],
    '<div class="factory-ui"><div role="tablist" aria-label="${input.label ?? "Sections"}">${(input.tabs ?? []).map((tab, index) => `<button role="tab" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${tab}</button>`).join("")}</div><section role="tabpanel"><p>${message}</p></section></div>',
  ],
  [
    "table",
    "table",
    ["Tab", "ArrowUp", "ArrowDown"],
    '<table class="factory-ui"><caption>${input.caption ?? "Data"}</caption><thead><tr><th scope="col">${input.heading ?? "Item"}</th></tr></thead><tbody><tr><td>${message}</td></tr></tbody></table>',
  ],
  [
    "card",
    "article",
    ["Tab"],
    '<article class="factory-ui" aria-labelledby="card-title"><h2 id="card-title">${input.title ?? "Card"}</h2><p>${message}</p></article>',
  ],
  [
    "badge",
    "status",
    ["No direct keyboard interaction"],
    '<span class="factory-ui" role="status" aria-label="${input.label ?? "Status"}">${input.value ?? message}</span>',
  ],
  [
    "separator",
    "separator",
    ["No direct keyboard interaction"],
    '<hr class="factory-ui" role="separator" aria-orientation="${input.orientation ?? "horizontal"}" />',
  ],
  [
    "skeleton",
    "status",
    ["No direct keyboard interaction"],
    '<div class="factory-ui" role="status" aria-live="polite" aria-busy="true"><span class="sr-only">${message}</span></div>',
  ],
  [
    "toast",
    "status",
    ["Escape"],
    '<output class="factory-ui" role="status" aria-live="polite">${input.message ?? message}<button type="button" aria-label="Dismiss notification">Dismiss</button></output>',
  ],
] as const;

const stateMessages: Record<InteractionState, string> = {
  loading: "Loading",
  empty: "No content available",
  validation: "Check the highlighted value",
  error: "Something went wrong",
  confirmation: "Saved",
  denial: "You do not have permission",
};

const functionName = (key: string) =>
  key.replace(/(^|-)([a-z])/g, (_match, _separator, letter: string) =>
    letter.toUpperCase(),
  );

const safeInputSource = `const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const sanitizeInput = (value) => Array.isArray(value) ? value.map(sanitizeInput) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeInput(child)])) : typeof value === "string" ? escapeHtml(value) : value;
export function restoreInvokingFocus(element) { if (element && typeof element.focus === "function") element.focus(); }`;
const primitiveStateSource = `const stateViews = Object.freeze({
  loading: '<section role="status" aria-live="polite" aria-busy="true">Loading</section>',
  empty: '<section role="status" aria-live="polite"><h2>Nothing here yet</h2><p>No content is available.</p></section>',
  validation: '<section role="status" aria-live="polite"><p>Check the highlighted values.</p></section>',
  error: '<section role="alert"><p>Something went wrong.</p><button type="button">Try again</button></section>',
  confirmation: '',
  denial: '<section role="alert"><h2>Access denied</h2><p>You do not have permission.</p></section>'
});`;

const sourceFor = (key: string, markup: string): CopyableSource => ({
  ownership: "factory-authored",
  license: "UNLICENSED",
  code: [
    safeInputSource,
    primitiveStateSource,
    `const ${key.replaceAll("-", "_")}Messages = ${JSON.stringify(stateMessages)};`,
    `export function render${functionName(key)}(input = {}, state = "confirmation") {`,
    `  if (typeof state !== "string" || !Object.hasOwn(stateViews, state)) throw new Error("Unknown ${key} state.");`,
    `  input = sanitizeInput(input);`,
    `  const message = ${key.replaceAll("-", "_")}Messages[state];`,
    `  if (!message) throw new Error("Unknown ${key} state.");`,
    `  if (state !== "confirmation") return stateViews[state];`,
    `  return \`${markup}\`;`,
    `}`,
    `export const ${key.replaceAll("-", "_")}Styles = \`.factory-ui:focus-visible{outline:3px solid currentColor;outline-offset:3px}@media(max-width:640px){.factory-ui{max-width:100%}}@media(min-width:641px) and (max-width:1024px){.factory-ui{max-width:48rem}}@media(min-width:1025px){.factory-ui{max-width:72rem}}@media(prefers-reduced-motion:reduce){.factory-ui{animation:none;transition:none}}\`;`,
  ].join("\n"),
});

const fixturesFor = (key: string): readonly StateFixture[] =>
  interactionStates.map((state) => ({ id: `${key}-${state}`, state }));

const registry = primitiveDefinitions.map(([key, role, keyboard, markup]) => ({
  key,
  version: "1.0.0" as const,
  states: [...interactionStates],
  fixtures: fixturesFor(key),
  responsive: ["mobile", "tablet", "desktop"] as const,
  iconPolicy: "lucide-only" as const,
  accessibility: {
    role,
    keyboard: [...keyboard],
    focus:
      "visible focus ring; dialogs restore focus to their invoking control",
  },
  source: sourceFor(key, markup),
}));

export const uiPrimitiveRegistry: readonly UiPrimitive[] = deepFreeze(registry);

export function findUiPrimitive(key: string): UiPrimitive {
  const item = uiPrimitiveRegistry.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Unknown primitive key '${key}'.`);
  return item;
}

export function validateUiPrimitiveRegistry(
  items: readonly UiPrimitive[],
): true {
  const keys = new Set<string>();
  for (const item of items) {
    if (keys.has(item.key))
      throw new Error(`Duplicate primitive key '${item.key}'.`);
    keys.add(item.key);
  }
  return assertExactData(items, uiPrimitiveRegistry, "UI primitive registry");
}
