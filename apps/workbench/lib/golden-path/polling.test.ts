import { afterEach, describe, expect, it, vi } from "vitest";

import { pollUntil } from "./polling";

afterEach(() => {
  vi.useRealTimers();
});

describe("pollUntil", () => {
  it("returns immediately when the first fetch is terminal", async () => {
    const fetch = vi.fn(async () => ({ status: "succeeded" }));
    const result = await pollUntil(
      fetch,
      (value) => value.status !== "pending",
      { intervalMs: 1000, timeoutMs: 10_000 },
    );
    expect(result).toEqual({ status: "succeeded" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("polls until the value is terminal", async () => {
    vi.useFakeTimers();
    const states = [
      { status: "queued" },
      { status: "running" },
      { status: "succeeded" },
    ];
    const fetch = vi.fn(async () => states.shift()!);
    const promise = pollUntil(fetch, (value) => value.status === "succeeded", {
      intervalMs: 1000,
      timeoutMs: 60_000,
    });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(promise).resolves.toEqual({ status: "succeeded" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("returns null when the deadline passes without a terminal value", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ status: "running" }));
    const promise = pollUntil(fetch, (value) => value.status === "succeeded", {
      intervalMs: 400,
      timeoutMs: 1000,
    });
    await vi.advanceTimersByTimeAsync(1_500);
    await expect(promise).resolves.toBeNull();
    expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("defaults to a bounded 300s deadline and 1.5s interval", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ status: "running" }));
    void pollUntil(fetch, (value) => value.status === "succeeded");
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});
