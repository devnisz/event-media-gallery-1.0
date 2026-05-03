/**
 * Cliente Supabase para Server Components, Route Handlers e services Node.
 * Preferir SUPABASE_SERVICE_ROLE_KEY em produção (Vercel) para writes sem RLS bloqueando anon.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
  isSupabaseConfigured,
  logSupabase,
} from "@/lib/supabase/config";

export function getSupabaseServerKeyMode(): "service" | "anon" | "none" {
  if (!isSupabaseConfigured()) {
    return "none";
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return service && service.length > 0 ? "service" : "anon";
}

export function createServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrlAtRuntime()!;
  const anon = getSupabaseAnonKeyAtRuntime()!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const key = service && service.length > 0 ? service : anon;

  if (!service) {
    logSupabase(
      "SUPABASE_SERVICE_ROLE_KEY ausente — usando ANON no servidor; configure RLS/policies ou a service role para writes em produção.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
