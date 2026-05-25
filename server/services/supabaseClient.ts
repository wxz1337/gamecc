import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let cachedSignature: string | null = null;

export type SupabaseConfigStatus = {
  configured: boolean;
  hasUrl: boolean;
  hasServiceRoleKey: boolean;
  missing: Array<"SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">;
};

function readSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  return {
    url,
    serviceRoleKey
  };
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const { url, serviceRoleKey } = readSupabaseConfig();
  const missing: SupabaseConfigStatus["missing"] = [];

  if (!url) {
    missing.push("SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    configured: missing.length === 0,
    hasUrl: url.length > 0,
    hasServiceRoleKey: serviceRoleKey.length > 0,
    missing
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigStatus().configured;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = readSupabaseConfig();

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    cachedSignature = null;
    return null;
  }

  const signature = `${url}::${serviceRoleKey}`;

  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  cachedSignature = signature;

  return cachedClient;
}

