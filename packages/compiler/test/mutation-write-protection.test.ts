import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { transpileModule } from "typescript";

describe("private shared write-protection fragments", () => {
  it("shares canonical hashing while fixing Task digest storage and approval raw storage", async () => {
    const port = await import("../src/mutation-write-protection.js").catch(
      () => null,
    );
    expect(port).not.toBeNull();
    if (!port) return;
    for (const profile of ["approval", "task"] as const) {
      const fragments = port.writeProtectionFragments(
        profile,
        "sha256:" + "1".repeat(64),
      );
      const source = `${fragments.canonical}\nconst normalized={z:1,a:{y:2,b:3}}; const role='member',actorScope='session',entityKey='task',recordId=undefined,operation='create'; let key='Retry.Key-1'; const fail${profile === "task" ? "Task" : "Approval"}=()=>{throw Error('invalid')}; ${fragments.validateKey}\n${fragments.identity}\nreturn {scope,requestHash,key:${profile === "task" ? "storedIdempotencyKey" : "key"}};`;
      const result = new Function(
        "createHash",
        transpileModule(source, { compilerOptions: { target: 99 } }).outputText,
      )(createHash);
      expect(result.requestHash).toBe(
        createHash("sha256").update('{"a":{"b":3,"y":2},"z":1}').digest("hex"),
      );
      expect(result.key).toBe(
        profile === "task"
          ? "sha256:" + createHash("sha256").update("Retry.Key-1").digest("hex")
          : "Retry.Key-1",
      );
    }
    expect(() =>
      port.writeProtectionFragments(
        "provider" as never,
        "sha256:" + "1".repeat(64),
      ),
    ).toThrow();
    expect(() =>
      port.writeProtectionFragments("task", "unsafe source"),
    ).toThrow();
  });
});
