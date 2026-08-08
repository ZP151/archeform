import { z } from "zod";

/**
 * Factory-owned Experience System over the existing `ExperienceModel`.
 *
 * The Graph may declare only bounded token values and approved recipe
 * selections. Token values are schema-validated against per-group value
 * patterns — never free text — so no arbitrary CSS, packages, scripts, or
 * component source can enter the Graph through the experience surface.
 * When a graph declares no design system, `resolveExperienceDesignSystem`
 * yields the deterministic Factory defaults, so the first Golden Path
 * requires no visual adjustment.
 */

/** Approved shell recipes (responsive application shells). */
export const shellVariantSchema = z.enum(["sidebar", "topbar"]);
/** Approved page-layout recipes. */
export const pageLayoutVariantSchema = z.enum([
  "table",
  "form",
  "detail",
  "dashboard",
]);
/** Approved density presets. */
export const densityPresetSchema = z.enum(["standard", "compact"]);
/** Approved accessible states every rendered component must support. */
export const accessibleStateSchema = z.enum([
  "focus",
  "contrast",
  "validation",
  "loading",
  "empty",
  "error",
]);

export const EXPERIENCE_DESIGN_SYSTEM_CATALOGUE = {
  shell: shellVariantSchema.options,
  pageLayouts: pageLayoutVariantSchema.options,
  density: densityPresetSchema.options,
  states: accessibleStateSchema.options,
  components: {
    button: ["primary", "secondary", "ghost", "danger"],
    input: ["default", "validation-error"],
    card: ["default", "elevated"],
    badge: ["default", "success", "warning", "danger"],
    table: ["default", "compact"],
    form: ["default", "split"],
    "nav-item": ["default", "active"],
  },
} as const;

export type ShellVariant = z.infer<typeof shellVariantSchema>;
export type PageLayoutVariant = z.infer<typeof pageLayoutVariantSchema>;
export type DensityPreset = z.infer<typeof densityPresetSchema>;
export type AccessibleState = z.infer<typeof accessibleStateSchema>;

const tokenKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-zA-Z0-9-]*$/);

/**
 * Token values are plain data with a tight value language per group: hex or
 * named colours, bounded lengths, unit-qualified durations, and a closed
 * shadow form. Every pattern excludes `;`, `{`, `}`, quotes, angle brackets,
 * and any `url(`/`expression(`/`javascript:` material — an injected style
 * block cannot pass, and no token value is ever executed.
 */
const colourValueSchema = z
  .string()
  .regex(
    /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|[a-z][a-z0-9-]*)$/,
  );
const typographyValueSchema = z
  .string()
  .regex(
    /^(?:system-ui|[0-9]+(?:\.[0-9]+)?(?:px|rem|em|%)|[1-9]00|normal|bold|[0-9]+(?:\.[0-9]+)?)$/,
  );
const lengthValueSchema = z
  .string()
  .regex(/^-?[0-9]+(?:\.[0-9]+)?(?:px|rem|em|%)$/);
const elevationValueSchema = z
  .string()
  .regex(
    /^(?:none|(?:(?:-?[0-9]+(?:\.[0-9]+)?px\s+)+(?:-?[0-9]+(?:\.[0-9]+)?px)?(?:\s+(?:#[0-9a-fA-F]{3,8}|[a-z][a-z0-9-]*))?))$/,
  );
const motionValueSchema = z
  .string()
  .regex(
    /^(?:[0-9]+(?:\.[0-9]+)?(?:ms|s)|cubic-bezier\((?:0|1|0?\.[0-9]+)(?:,\s*(?:0|1|0?\.[0-9]+)){3}\))$/,
  );

const colourTokensSchema = z.object({
  light: z.record(tokenKeySchema, colourValueSchema),
  dark: z.record(tokenKeySchema, colourValueSchema),
});

const tokensSchema = z.object({
  colour: colourTokensSchema.default({ light: {}, dark: {} }),
  typography: z.record(tokenKeySchema, typographyValueSchema).default({}),
  spacing: z.record(tokenKeySchema, lengthValueSchema).default({}),
  radius: z.record(tokenKeySchema, lengthValueSchema).default({}),
  elevation: z.record(tokenKeySchema, elevationValueSchema).default({}),
  motion: z.record(tokenKeySchema, motionValueSchema).default({}),
});

const selectionSchema = z.object({
  shell: shellVariantSchema,
  density: densityPresetSchema,
  pageLayouts: z.record(tokenKeySchema, pageLayoutVariantSchema).default({}),
});

const componentsSchema = z
  .record(tokenKeySchema, tokenKeySchema)
  .superRefine((components, context) => {
    for (const [component, variant] of Object.entries(components)) {
      const approved = (
        EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.components as Record<
          string,
          readonly string[]
        >
      )[component];
      if (approved === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Component '${component}' is not in the approved component catalogue.`,
          path: [component],
        });
        continue;
      }
      if (!approved.includes(variant)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Variant '${variant}' is not approved for component '${component}'.`,
          path: [component],
        });
      }
    }
  });

export const experienceDesignSystemSchema = z
  .object({
    apiVersion: z.literal("factory.experience-design-system/v1"),
    tokens: tokensSchema,
    selection: selectionSchema,
    components: componentsSchema,
    states: z
      .array(accessibleStateSchema)
      .min(1)
      .default([...EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.states]),
  })
  .strict();

export type ExperienceDesignSystemV1 = z.infer<
  typeof experienceDesignSystemSchema
>;
export type ExperienceTokensV1 = ExperienceDesignSystemV1["tokens"];

export function assertExperienceDesignSystem(
  input: unknown,
): ExperienceDesignSystemV1 {
  return experienceDesignSystemSchema.parse(input);
}

/**
 * The deterministic Factory defaults for the first Golden Path: an approved,
 * schema-valid system over the canonical token groups. Declared graph tokens
 * override these per key; the defaults never change across calls.
 */
export const EXPERIENCE_DESIGN_SYSTEM_DEFAULTS: ExperienceDesignSystemV1 = {
  apiVersion: "factory.experience-design-system/v1",
  tokens: {
    colour: {
      light: {
        brand: "#0f6f5c",
        background: "#f6f7f5",
        surface: "#ffffff",
        text: "#1a231f",
        "text-muted": "#5c6b63",
        border: "#d6ddd6",
        "focus-ring": "#0f6f5c",
        success: "#1f7a3d",
        warning: "#b25e00",
        danger: "#b3261e",
        info: "#1f5fb3",
      },
      dark: {
        brand: "#4fc3a1",
        background: "#101613",
        surface: "#1a221e",
        text: "#e8efe9",
        "text-muted": "#93a29a",
        border: "#33403a",
        "focus-ring": "#4fc3a1",
        success: "#66bb6a",
        warning: "#ffb74d",
        danger: "#ef5350",
        info: "#64b5f6",
      },
    },
    typography: {
      "font-family": "system-ui",
      "font-size-sm": "0.875rem",
      "font-size-base": "1rem",
      "font-size-lg": "1.25rem",
      "font-size-xl": "1.5rem",
      "font-weight-regular": "400",
      "font-weight-medium": "500",
      "font-weight-bold": "700",
      "line-height-base": "1.5",
    },
    spacing: {
      "space-1": "0.25rem",
      "space-2": "0.5rem",
      "space-3": "0.75rem",
      "space-4": "1rem",
      "space-6": "1.5rem",
      "space-8": "2rem",
    },
    radius: {
      "radius-sm": "0.25rem",
      "radius-base": "0.5rem",
      "radius-lg": "0.75rem",
      "radius-full": "9999px",
    },
    elevation: {
      "elevation-sm": "0px 1px 2px #00000014",
      "elevation-md": "0px 2px 8px #0000001f",
      "elevation-lg": "0px 8px 24px #00000029",
    },
    motion: {
      "duration-fast": "120ms",
      "duration-base": "200ms",
      "duration-slow": "320ms",
      "easing-standard": "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  selection: {
    shell: "sidebar",
    density: "standard",
    pageLayouts: {},
  },
  components: {
    button: "primary",
    input: "default",
    card: "default",
    badge: "default",
    table: "default",
    form: "default",
    "nav-item": "default",
  },
  states: ["focus", "contrast", "validation", "loading", "empty", "error"],
};

export type ExperienceModelLike = {
  readonly theme: {
    readonly mode: string;
    readonly tokens: Record<string, string>;
  };
  readonly designSystem?: unknown;
  readonly locales: readonly string[];
};

function mergeRecords(
  defaults: Readonly<Record<string, string>>,
  declared: Readonly<Record<string, string>>,
): Record<string, string> {
  return { ...defaults, ...declared };
}

/**
 * Resolves the effective Experience Design System for any ExperienceModel:
 * deterministic Factory defaults merged with the graph's declared tokens,
 * selections, component variants, and states. Declared values win per key;
 * everything else keeps the default. The result is schema-validated, so a
 * resolved system can never carry unapproved selections or unsafe values.
 */
export function resolveExperienceDesignSystem(
  experience: ExperienceModelLike,
): ExperienceDesignSystemV1 {
  const declared = experience.designSystem as
    Partial<ExperienceDesignSystemV1> | undefined;
  const tokens = declared?.tokens;
  const selection = declared?.selection;
  const resolved: ExperienceDesignSystemV1 = {
    apiVersion: "factory.experience-design-system/v1",
    tokens: {
      colour: {
        light: mergeRecords(
          EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.colour.light,
          tokens?.colour?.light ?? {},
        ),
        dark: mergeRecords(
          EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.colour.dark,
          tokens?.colour?.dark ?? {},
        ),
      },
      typography: mergeRecords(
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.typography,
        tokens?.typography ?? {},
      ),
      spacing: mergeRecords(
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.spacing,
        tokens?.spacing ?? {},
      ),
      radius: mergeRecords(
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.radius,
        tokens?.radius ?? {},
      ),
      elevation: mergeRecords(
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.elevation,
        tokens?.elevation ?? {},
      ),
      motion: mergeRecords(
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.motion,
        tokens?.motion ?? {},
      ),
    },
    selection: {
      shell:
        selection?.shell ?? EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.selection.shell,
      density:
        selection?.density ??
        EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.selection.density,
      pageLayouts: {
        ...EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.selection.pageLayouts,
        ...(selection?.pageLayouts ?? {}),
      },
    },
    components: {
      ...EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.components,
      ...(declared?.components ?? {}),
    },
    states: declared?.states ?? EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.states,
  };
  return assertExperienceDesignSystem(resolved);
}

/**
 * The deterministic default page layout for a page with no declared layout
 * selection, derived from its block kinds: table-first, then form, then the
 * generic detail recipe.
 */
export function defaultPageLayoutFor(page: {
  readonly id: string;
  readonly blocks: readonly { readonly type: string }[];
}): PageLayoutVariant {
  const types = page.blocks.map((block) => block.type);
  if (types.some((type) => type.includes("table"))) return "table";
  if (types.some((type) => type.includes("form"))) return "form";
  return "detail";
}

/** Effective layout for a page: declared selection, else deterministic default. */
export function resolvePageLayout(
  designSystem: ExperienceDesignSystemV1,
  page: {
    readonly id: string;
    readonly blocks: readonly { readonly type: string }[];
  },
): PageLayoutVariant {
  return (
    designSystem.selection.pageLayouts[page.id] ?? defaultPageLayoutFor(page)
  );
}
