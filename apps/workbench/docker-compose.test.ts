import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Factory Compose Workbench endpoint", () => {
  it("derives the browser Control Plane endpoint from the isolated host port", () => {
    const compose = readFileSync(
      resolve(process.cwd(), "../../infra/docker-compose.yml"),
      "utf8",
    );

    expect(compose).toContain(
      "${FACTORY_PUBLIC_CONTROL_PLANE_URL:-http://localhost:${FACTORY_CONTROL_PLANE_PORT:-3000}}",
    );
    expect(compose).not.toContain(
      "NEXT_PUBLIC_CONTROL_PLANE_URL: ${NEXT_PUBLIC_CONTROL_PLANE_URL:-",
    );
  });
});
