"use client";

/**
 * Cliente browser (anon) para futura UI autenticada ou leituras públicas.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

export function createBrowserSupabase(): SupabaseClient {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();

  if (!url || !anon) {
    throw new Error(
      "Supabase no browser: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_URL / SUPABASE_ANON_KEY espelhados para o bundle).",
    );
  }

  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
