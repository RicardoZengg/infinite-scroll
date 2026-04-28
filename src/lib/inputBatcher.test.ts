import { describe, expect, it, vi } from "vitest";

import { createInputBatcher } from "./inputBatcher";

describe("createInputBatcher", () => {
  it("batches multiple pushes into one flush", async () => {
    vi.useFakeTimers();
    const flush = vi.fn(async () => undefined);
    const batcher = createInputBatcher({ flush, intervalMs: 12 });

    batcher.push("a");
    batcher.push("b");
    batcher.push("c");

    vi.advanceTimersByTime(12);
    await Promise.resolve();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith("abc");

    batcher.dispose();
    vi.useRealTimers();
  });

  it("flushes immediately when max batch size is reached", async () => {
    vi.useFakeTimers();
    const flush = vi.fn(async () => undefined);
    const batcher = createInputBatcher({ flush, maxBatchSize: 3, intervalMs: 100 });

    batcher.push("ab");
    batcher.push("c");
    await Promise.resolve();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith("abc");

    batcher.dispose();
    vi.useRealTimers();
  });

  it("supports manual flush", async () => {
    vi.useFakeTimers();
    const flush = vi.fn(async () => undefined);
    const batcher = createInputBatcher({ flush, intervalMs: 100 });

    batcher.push("xyz");
    batcher.flushNow();
    await Promise.resolve();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith("xyz");

    batcher.dispose();
    vi.useRealTimers();
  });
});
