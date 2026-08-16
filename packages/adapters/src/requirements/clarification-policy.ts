export const SAFE_NONCRITICAL_CLARIFICATION_DEFAULT =
  "Use the product's standard visual theme.";

export interface FactoryClarificationQuestion {
  readonly category:
    | "experience.visual-style"
    | "authorization"
    | "visibility"
    | "role"
    | "business-rule"
    | "data"
    | "integration";
  readonly defaultPolicy: "factory-standard-visual" | "required";
}

export function factoryClarificationDefault(
  question: FactoryClarificationQuestion,
): string | null {
  return question.category === "experience.visual-style" &&
    question.defaultPolicy === "factory-standard-visual"
    ? SAFE_NONCRITICAL_CLARIFICATION_DEFAULT
    : null;
}
