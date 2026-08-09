import {
  FixtureRequirementInterpreter,
  OpenAIRequirementInterpreterAdapter,
  type RequirementInterpreterAdapterV1,
} from "@factory/adapters";

/**
 * Provider selection for the requirement interpret route: a free-form
 * business brief and any clarification answers are transient input
 * interpreted into the checksum-bound RequirementSpec and ProductBlueprint.
 * The brief and answers never persist and never appear in the response —
 * only the parsed interpretation crosses the boundary. Under test the
 * deterministic fixture interprets; everywhere else the real OpenAI
 * interpreter runs, and a missing provider key fails closed with 503 rather
 * than silently running a fake model.
 *
 * FACTORY_FIXTURE_MODE=1 is the explicit development/E2E-only lever for the
 * deterministic fixture (default off, never a fallback): the container E2E
 * drives both acceptance prompts through the full pipeline without a
 * provider key, while final acceptance always runs the real provider — or
 * fails closed when no key is configured.
 */
export function interpreter(): RequirementInterpreterAdapterV1 {
  // The fixture is the deterministic test authority and the explicit
  // development/E2E lever; any other environment must use the real provider
  // or fail closed without a configured key.
  if (
    process.env.NODE_ENV === "test" ||
    process.env.FACTORY_FIXTURE_MODE === "1"
  ) {
    return new FixtureRequirementInterpreter();
  }
  return new OpenAIRequirementInterpreterAdapter();
}
