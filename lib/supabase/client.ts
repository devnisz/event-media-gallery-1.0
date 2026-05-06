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

  if (process.env.NODE_ENV === "development") {
    console.log("[Supabase browser]", {
      hasUrl: Boolean(url),
      hasAnon: Boolean(anon),
    });
  }

  if (!url || !anon) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Supabase browser] defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    return null;
  }

  supabaseClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}
