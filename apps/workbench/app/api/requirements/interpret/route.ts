import { NextResponse } from "next/server";

import {
  FixtureRequirementInterpreter,
  OpenAIRequirementInterpreterAdapter,
} from "@factory/adapters";

import {
  classifyInterpretationError,
  parseInterpretPayload,
} from "../../../../lib/product-journey/interpret-payload";

/**
 * Requirement interpretation route: a free-form business brief and any
 * clarification answers are transient input interpreted into the
 * checksum-bound RequirementSpec and ProductBlueprint. The brief and answers
 * never persist and never appear in the response — only the parsed
 * interpretation crosses the boundary. Under test the deterministic fixture
 * interprets; everywhere else the real OpenAI interpreter runs, and a
 * missing provider key fails closed with 503 rather than silently running a
 * fake model.
 */

function interpreter() {
  // The fixture is the deterministic test authority; any other environment
  // must use the real provider or fail closed without a configured key.
  if (process.env.NODE_ENV === "test") {
    return new FixtureRequirementInterpreter();
  }
  return new OpenAIRequirementInterpreterAdapter();
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  const payload = parseInterpretPayload(body);
  if (payload === null) {
    return NextResponse.json(
      { error: "Invalid requirement brief or answers." },
      { status: 400 },
    );
  }
  try {
    const result = await interpreter().interpret(payload);
    return NextResponse.json({ interpretation: result });
  } catch (error) {
    const classified = classifyInterpretationError(error);
    return NextResponse.json(
      { error: classified.error },
      { status: classified.status },
    );
  }
}
