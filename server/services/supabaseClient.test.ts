import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseClient, getSupabaseConfigStatus, isSupabaseConfigured } from "./supabaseClient.js";

describe("supabaseClient", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports missing config without throwing on import", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const status = getSupabaseConfigStatus();

    expect(status.configured).toBe(false);
    expect(status.missing).toEqual(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it("creates a client when the server config is present", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const status = getSupabaseConfigStatus();

    expect(status.configured).toBe(true);
    expect(status.missing).toEqual([]);
    expect(getSupabaseClient()).not.toBeNull();
    expect(isSupabaseConfigured()).toBe(true);
  });
});

