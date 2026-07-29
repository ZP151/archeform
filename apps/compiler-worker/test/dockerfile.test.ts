import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("local worker Docker runtime", () => {
  it("installs the Docker Compose client only in the compiler worker image", async () => {
    const dockerfile = await readFile(
      new URL("../Dockerfile", import.meta.url),
      "utf8",
    );
    expect(dockerfile).toMatch(
      /apk add --no-cache docker-cli docker-cli-compose/,
    );
  });

  it("mounts the local Docker socket only into compiler-worker", async () => {
    const compose = await readFile(
      new URL("../../../infra/docker-compose.yml", import.meta.url),
      "utf8",
    );
    const worker = compose.slice(
      compose.indexOf("  compiler-worker:"),
      compose.indexOf("  workbench:"),
    );
    const beforeWorker = compose.slice(
      0,
      compose.indexOf("  compiler-worker:"),
    );
    const afterWorker = compose.slice(compose.indexOf("  workbench:"));
    expect(worker).toContain("/var/run/docker.sock:/var/run/docker.sock");
    expect(`${beforeWorker}${afterWorker}`).not.toContain(
      "/var/run/docker.sock",
    );
  });
});
