import {
  getProfileComposition,
  type FactoryProfile,
  type OptionalCapabilityKey,
} from "@factory/capabilities";

export type GuidedCreationStage =
  "template" | "capabilities" | "details" | "review";

export type GuidedCreationInput = {
  readonly profile: FactoryProfile | null;
  readonly optionalCapabilities: readonly OptionalCapabilityKey[];
  readonly name: string;
  readonly theme: "light" | "dark";
};

export type GuidedCreationState = {
  readonly open: boolean;
  readonly stage: GuidedCreationStage;
  readonly input: GuidedCreationInput;
  readonly error: string | null;
  readonly creating: boolean;
};

export type GuidedCreationAction =
  | { readonly type: "open" }
  | { readonly type: "close" }
  | { readonly type: "select-profile"; readonly profile: FactoryProfile }
  | {
      readonly type: "toggle-optional-capability";
      readonly capability: OptionalCapabilityKey;
    }
  | { readonly type: "set-name"; readonly name: string }
  | { readonly type: "set-theme"; readonly theme: "light" | "dark" }
  | { readonly type: "next" }
  | { readonly type: "back" }
  | { readonly type: "create" }
  | { readonly type: "create-failed"; readonly message: string }
  | { readonly type: "create-succeeded" };

export const initialGuidedCreationState: GuidedCreationState = {
  open: false,
  stage: "template",
  input: {
    profile: null,
    optionalCapabilities: [],
    name: "",
    theme: "light",
  },
  error: null,
  creating: false,
};

function nameError(name: string): string | null {
  if (!name.trim()) return "Application name is required.";
  if (name.trim().length > 160) {
    return "Application name must not exceed 160 characters.";
  }
  return null;
}

export function transitionGuidedCreation(
  state: GuidedCreationState,
  action: GuidedCreationAction,
): GuidedCreationState {
  switch (action.type) {
    case "open":
      return { ...initialGuidedCreationState, open: true };
    case "close":
    case "create-succeeded":
      return initialGuidedCreationState;
    case "select-profile":
      return {
        ...state,
        input: {
          ...state.input,
          profile: action.profile,
          optionalCapabilities: [
            ...getProfileComposition(action.profile)
              .defaultOptionalCapabilities,
          ],
        },
        error: null,
      };
    case "toggle-optional-capability": {
      if (!state.input.profile) {
        return { ...state, error: "Choose an application outcome." };
      }
      const available = getProfileComposition(
        state.input.profile,
      ).defaultOptionalCapabilities;
      if (!available.includes(action.capability)) {
        return {
          ...state,
          error: `Capability '${action.capability}' is not available for this outcome.`,
        };
      }
      const selected = state.input.optionalCapabilities.includes(
        action.capability,
      )
        ? state.input.optionalCapabilities.filter(
            (capability) => capability !== action.capability,
          )
        : [...state.input.optionalCapabilities, action.capability];
      return {
        ...state,
        input: { ...state.input, optionalCapabilities: selected },
        error: null,
      };
    }
    case "set-name":
      return {
        ...state,
        input: { ...state.input, name: action.name },
        error: null,
      };
    case "set-theme":
      return {
        ...state,
        input: { ...state.input, theme: action.theme },
        error: null,
      };
    case "back":
      return state.stage === "review"
        ? { ...state, stage: "details", error: null }
        : state.stage === "details"
          ? { ...state, stage: "capabilities", error: null }
          : state.stage === "capabilities"
            ? { ...state, stage: "template", error: null }
            : state;
    case "next":
      if (state.stage === "template") {
        return state.input.profile
          ? { ...state, stage: "capabilities", error: null }
          : { ...state, error: "Choose an application outcome." };
      }
      if (state.stage === "capabilities") {
        return { ...state, stage: "details", error: null };
      }
      if (state.stage === "details") {
        const error = nameError(state.input.name);
        return error
          ? { ...state, error }
          : { ...state, stage: "review", error: null };
      }
      return state;
    case "create":
      return state.stage === "review" && state.input.profile
        ? { ...state, creating: true, error: null }
        : state;
    case "create-failed":
      return { ...state, creating: false, error: action.message };
    default:
      return state;
  }
}
