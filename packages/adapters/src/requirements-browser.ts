/**
 * Browser-safe requirement journey contracts and clarification helpers.
 *
 * Keep this entry point independent from server-only planners and providers so
 * Workbench client components never pull Node built-ins into the browser
 * bundle through the package root.
 */
export {
  assertRequirementInterpretation,
  resolveClarificationCycle,
  type ClarificationAnswerContextV1,
  type ClarificationQuestionV1,
  type RequirementInterpretationV1,
} from "./requirements/requirement-interpreter.js";
