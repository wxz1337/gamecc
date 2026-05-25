import { describe, expect, it, vi } from "vitest";
import { runWithInFlightDeduplication } from "./inFlightRequestService.js";

describe("inFlightRequestService", () => {
  it("dedupes concurrent requests for the same key", async () => {
    let resolveFactory: ((value: string) => void) | null = null;
    const factory = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFactory = resolve;
        })
    );

    const first = runWithInFlightDeduplication("source-window:v1:lol:2026-05-01:2026-05-07:all", factory);
    const second = runWithInFlightDeduplication("source-window:v1:lol:2026-05-01:2026-05-07:all", factory);

    await Promise.resolve();

    expect(factory).toHaveBeenCalledTimes(1);
    if (!resolveFactory) {
      throw new Error("factory was not initialized");
    }

    (resolveFactory as (value: string) => void)("ok");

    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
  });

  it("cleans up the key after failure so the next request can run again", async () => {
    const factory = vi.fn();
    factory.mockRejectedValueOnce(new Error("boom"));
    factory.mockResolvedValueOnce("ok");

    await expect(
      runWithInFlightDeduplication("source-window:v1:cs2:2026-05-01:2026-05-07:all", factory)
    ).rejects.toThrow("boom");

    await expect(
      runWithInFlightDeduplication("source-window:v1:cs2:2026-05-01:2026-05-07:all", factory)
    ).resolves.toBe("ok");

    expect(factory).toHaveBeenCalledTimes(2);
  });
});
