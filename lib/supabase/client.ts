"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Cliente Supabase no browser (singleton). Sem env público → null (não lança).
 */
export function createBrowserSupabase(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anon) {
    console.warn(
      "[REALTIME] createBrowserSupabase: URL ou anon ausentes (NEXT_PUBLIC_*)",
    );
    return null;
  }

  supabaseClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log("[REALTIME] createBrowserSupabase: cliente instanciado (singleton)");

  return supabaseClient;
}
