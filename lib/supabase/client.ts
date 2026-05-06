"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

/**
 * Cliente browser com sessão em cookies (pareado com `middleware` + `@supabase/ssr`).
 */
export function createBrowserSupabase(): SupabaseClient | null {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();

  if (!url?.trim() || !anon?.trim()) {
    console.warn(
      "[Supabase] URL ou chave anon ausentes; defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return null;
  }

  return createBrowserClient(url.trim(), anon.trim());
}
