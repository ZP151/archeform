import { describe, expect, it } from "vitest";

import { CompositionService } from "../dist/composition/composition.service.js";
// The dist service imports the dist PrismaService module; the expected token
// must be the same module instance, so this import is from dist as well.
import { PrismaService } from "../dist/prisma.service.js";

/**
 * The CompositionService wiring must stay bootable. Nest resolves constructor
 * parameters from `design:paramtypes` metadata, so every injectable parameter
 * must carry a runtime token: a type-only import of an injectable class
 * degrades that parameter's metadata to `Function`, and the application fails
 * to boot with "Nest can't resolve dependencies of the CompositionService".
 *
 * The metadata is emitted by tsc (`emitDecoratorMetadata`), not by vitest's
 * esbuild transform — so this contract is asserted against the compiled
 * module, and the package `test` script builds before running the suite.
 *
 * Regression: the Docker verifier loop's control-plane boot surfaced the
 * crash; every sibling consumer imports PrismaService as a value, only
 * composition.service.ts imported it as a type.
 */
describe("CompositionService dependency-injection metadata", () => {
  it("resolves the PrismaService class as the first constructor parameter", () => {
    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      CompositionService,
    );
    expect(paramTypes?.[0]).toBe(PrismaService);
  });
});
