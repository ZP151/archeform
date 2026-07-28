import { describe, expect, it } from "vitest";

import { AppController } from "../src/app.controller.js";
import { AppService } from "../src/app.service.js";

describe("AppController", () => {
  it("reports the control-plane health contract", () => {
    const controller = new AppController(new AppService());

    expect(controller.health()).toEqual({
      status: "ok",
      service: "control-plane",
    });
  });
});
