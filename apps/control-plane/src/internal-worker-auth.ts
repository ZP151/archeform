import { UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "node:crypto";

function tokenDigest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function assertInternalWorkerToken(
  receivedToken: string | undefined,
  configuredToken: string | undefined = process.env
    .FACTORY_INTERNAL_WORKER_TOKEN,
): void {
  if (
    typeof receivedToken !== "string" ||
    receivedToken.length === 0 ||
    typeof configuredToken !== "string" ||
    configuredToken.length === 0 ||
    !timingSafeEqual(tokenDigest(receivedToken), tokenDigest(configuredToken))
  ) {
    throw new UnauthorizedException("Worker authentication is required.");
  }
}
