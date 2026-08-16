const fineDiningManifest = {
  key: "fine-dining",
  version: "1.0.0",
  responsive: ["mobile", "tablet", "desktop"],
  parameters: ["density", "imageTreatment", "cornerRadius"],
  tokens: {
    light: {
      surface: "#fffaf2",
      text: "#20170f",
      accent: "#925f2a",
      border: "#ddc7aa",
    },
    dark: {
      surface: "#1f1812",
      text: "#fff7ec",
      accent: "#e0aa6d",
      border: "#705332",
    },
  },
  motion: { default: "subtle", reduced: "none" },
  accessibility: {
    focusVisible: true,
    contrast: "AA",
    motionPreference: "prefers-reduced-motion",
  },
  source: {
    ownership: "factory-authored",
    license: "UNLICENSED",
    code: `export const fineDiningTokens = {
  light: { surface: "#fffaf2", text: "#20170f", accent: "#925f2a", border: "#ddc7aa" },
  dark: { surface: "#1f1812", text: "#fff7ec", accent: "#e0aa6d", border: "#705332" }
};
export const fineDiningStyles = \`:root{color-scheme:light dark;--surface:#fffaf2;--text:#20170f;--accent:#925f2a;--border:#ddc7aa}@media(prefers-color-scheme:dark){:root{--surface:#1f1812;--text:#fff7ec;--accent:#e0aa6d;--border:#705332}}@media(max-width:640px){:root{--density:0.75rem;--radius:0.5rem}}@media(min-width:641px){:root{--density:1rem;--radius:0.75rem}}@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}:focus-visible{outline:3px solid var(--accent);outline-offset:3px}\`;`,
  },
} as const;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const exactDataEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => exactDataEqual(item, right[index]))
    );
  }
  if (
    Object.getPrototypeOf(left) !== Object.prototype ||
    Object.getPrototypeOf(right) !== Object.prototype
  )
    return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        exactDataEqual(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
        ),
    )
  );
};

export const fineDiningRecipe = deepFreeze(fineDiningManifest);

export function validateFineDiningRecipe(input: unknown): true {
  if (!exactDataEqual(input, fineDiningRecipe)) {
    throw new Error("Fine Dining recipe must equal the exact frozen manifest.");
  }
  return true;
}
