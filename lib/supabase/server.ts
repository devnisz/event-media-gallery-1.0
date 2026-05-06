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

/** Lê o claim `role` do JWT Supabase (sem validar assinatura). Útil para detectar anon no lugar de service_role. */
export function peekSupabaseKeyJwtRole(key: string): string | undefined {
  const t = key.trim();
  if (!t.startsWith("eyJ")) {
    return undefined;
  }

  try {
    const B = globalThis.Buffer;
    if (!B) {
      return undefined;
    }

    const part = t.split(".")[1];
    if (!part) {
      return undefined;
    }

    const payload = JSON.parse(B.from(part, "base64url").toString("utf8")) as {
      role?: string;
    };

    return typeof payload.role === "string" ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

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

  const jwtRole = peekSupabaseKeyJwtRole(service);

  if (jwtRole && jwtRole !== "service_role") {
    logSupabase(
      `SUPABASE_SERVICE_ROLE_KEY tem JWT role="${jwtRole}" (esperado "service_role"). Usar a secret service_role em Supabase → Project Settings → API. Se estiver a usar a chave anon aqui, o upsert falha nas políticas RLS.`,
    );
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
