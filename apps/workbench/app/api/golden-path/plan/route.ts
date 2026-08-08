import { NextResponse } from "next/server";

import {
  clarificationQuestions,
  type ClarificationAnswer,
  type ClarificationKey,
  type DiscussSession,
} from "../../../../lib/golden-path/discuss-model";
import { planExpenseApprovalAlternatives } from "../../../../lib/golden-path/plan-alternatives";

/**
 * Golden Path plan route: the deterministic planner reads recipe fixtures
 * from the repository root, so it runs server-side, never in the browser
 * bundle. The route accepts only a bounded, fail-closed session — known
 * question keys and bounded answer text — and returns the same
 * PlanAlternativesResult shape the planner produces. No raw prompt or model
 * content ever enters this path: the planner is fully deterministic.
 */

const MAX_ANSWER_LENGTH = 64;

function parseSession(value: unknown): DiscussSession | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    readonly mode?: unknown;
    readonly answers?: unknown;
  };
  if (candidate.mode !== "discuss" || !Array.isArray(candidate.answers)) {
    return null;
  }
  const knownKeys = new Set<ClarificationKey>(
    clarificationQuestions().map((question) => question.key),
  );
  const answers: ClarificationAnswer[] = [];
  for (const entry of candidate.answers) {
    if (typeof entry !== "object" || entry === null) return null;
    const answer = entry as {
      readonly key?: unknown;
      readonly answer?: unknown;
      readonly deferred?: unknown;
    };
    if (
      typeof answer.key !== "string" ||
      !knownKeys.has(answer.key as ClarificationKey) ||
      typeof answer.answer !== "string" ||
      answer.answer.length > MAX_ANSWER_LENGTH
    ) {
      return null;
    }
    answers.push({
      key: answer.key as ClarificationKey,
      answer: answer.answer,
      deferred: answer.deferred === true,
    });
  }
  return { mode: "discuss", answers };
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
  // The workbench client posts the journey session under `session`; reject a
  // payload that does not carry exactly that envelope.
  const session = parseSession(
    (body as { readonly session?: unknown } | null)?.session,
  );
  if (session === null) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }
  const result = planExpenseApprovalAlternatives(session);
  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
