import { UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "node:crypto";

const acceptanceTokenPattern = /^[a-f0-9]{64}$/u;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function assertLocalAcceptanceCapability(
  receivedWorkerToken: string | undefined,
  receivedAcceptanceToken: string | undefined,
  configuredWorkerToken: string | undefined = process.env
    .FACTORY_INTERNAL_WORKER_TOKEN,
  configuredAcceptanceToken: string | undefined = process.env
    .FACTORY_LOCAL_ACCEPTANCE_TOKEN,
): void {
  const receivedWorker =
    typeof receivedWorkerToken === "string" ? receivedWorkerToken : "";
  const configuredWorker =
    typeof configuredWorkerToken === "string" ? configuredWorkerToken : "";
  const receivedAcceptance =
    typeof receivedAcceptanceToken === "string" ? receivedAcceptanceToken : "";
  const configuredAcceptance =
    typeof configuredAcceptanceToken === "string"
      ? configuredAcceptanceToken
      : "";
  const workerMatches = timingSafeEqual(
    digest(receivedWorker),
    digest(configuredWorker),
  );
  const acceptanceMatches = timingSafeEqual(
    digest(receivedAcceptance),
    digest(configuredAcceptance),
  );
  const workerShapesAreValid =
    receivedWorker.length > 0 && configuredWorker.length > 0;
  const acceptanceShapesAreValid =
    acceptanceTokenPattern.test(receivedAcceptance) &&
    acceptanceTokenPattern.test(configuredAcceptance);
  if (
    !workerShapesAreValid ||
    !acceptanceShapesAreValid ||
    !workerMatches ||
    !acceptanceMatches
  ) {
    throw new UnauthorizedException(
      "Local acceptance authentication is required.",
    );
  }
}
