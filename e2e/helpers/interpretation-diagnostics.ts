import type { Page, Response } from "@playwright/test";

const allowedCodes = new Set([
  "requirement.request_invalid",
  "requirement.output_invalid",
  "requirement.provider_rejected",
  "requirement.provider_not_configured",
  "requirement.provider_unavailable",
  "requirement.timeout",
  "requirement.failed",
]);

/** Observe only the public failure envelope; never emit body or model text. */
export function observeInterpretation(page: Page): () => Promise<void> {
  const pending: Promise<void>[] = [];
  const observe = (response: Response): void => {
    if (
      response.request().method() !== "POST" ||
      new URL(response.url()).pathname !== "/api/requirements/interpret"
    )
      return;
    pending.push(
      (async () => {
        let code = response.ok() ? "succeeded" : "unrecognized";
        if (!response.ok()) {
          const body: unknown = await response.json().catch(() => null);
          if (typeof body === "object" && body !== null && "error" in body) {
            const error = body.error;
            if (
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              typeof error.code === "string" &&
              allowedCodes.has(error.code)
            ) {
              code = error.code;
            }
          }
        }
        console.info(
          "FACTORY_INTERPRETATION_HTTP_EVIDENCE",
          JSON.stringify({
            code,
            status: response.status(),
          }),
        );
      })().catch(() => undefined),
    );
  };
  page.on("response", observe);
  return async () => {
    page.off("response", observe);
    await Promise.all(pending);
  };
}
