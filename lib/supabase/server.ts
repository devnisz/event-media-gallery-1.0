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

/**
 * Cliente Supabase com **única** a chave `SUPABASE_SERVICE_ROLE_KEY`.
 * Usar em repositórios e jobs internos (upserts, sync, leituras agregadoras).
 * Bypassa RLS — necessário porque estes caminhos não têm `auth.uid()` de utilizador.
 *
 * **Nunca** enviar esta chave ao browser.
 */
export function createServiceRoleSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrlAtRuntime();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url?.trim() || !service) {
    return null;
  }

  return createClient(url.trim(), service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Cliente com service role se existir; caso contrário **anon** (pode ser bloqueado por RLS em writes).
 * Preferir `createServiceRoleSupabase()` para operações de persistência da grelha eventos/mídia.
 */
export function createServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url?.trim()) {
    return null;
  }

  const key =
    service && service.length > 0 ? service : anon?.trim() ? anon : undefined;

  if (!key) {
    logSupabase(
      "URL definida mas nenhuma chave utilizável (defina SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY).",
    );
    return null;
  }

  if (!service || service.length === 0) {
    logSupabase(
      "SUPABASE_SERVICE_ROLE_KEY ausente — usando ANON no servidor; writes na grelha com RLS devem usar service role (ver createServiceRoleSupabase).",
    );
  }

  return createClient(url.trim(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
