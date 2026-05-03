"use client";

/**
 * Cliente browser (anon) para futura UI autenticada ou leituras públicas.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

export function createBrowserSupabase(): SupabaseClient | null {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();

  if (!url || !anon) {
    return null;
  }

  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
