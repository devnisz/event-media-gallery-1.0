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

/** Remove aspas, BOM e espaços que costumam corromper JWT ao colar na Vercel. */
export function normalizeSupabaseKeyForJwt(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("\uFEFF")) {
    t = t.replace(/^\uFEFF/, "").trim();
  }
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.replace(/\s/g, "");
}

/** Lê o claim `role` do JWT Supabase (sem validar assinatura). Útil para detectar anon no lugar de service_role. */
export function peekSupabaseKeyJwtRole(raw: string): string | undefined {
  const key = normalizeSupabaseKeyForJwt(raw);
  if (!key.startsWith("eyJ")) {
    return undefined;
  }

  try {
    const B = globalThis.Buffer;
    if (!B) {
      return undefined;
    }

    const part = key.split(".")[1];
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

export type ServiceRoleClientOutcome =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: string };

/**
 * Resolve cliente com **única** a secret `service_role`.
 * Não devolve cliente se a env tiver anon, JWT inválido ou role ≠ service_role
 * (antes isto só logava um aviso e criava o cliente com a chave errada → erro 42501 RLS).
 */
export function createServiceRoleSupabaseResult(): ServiceRoleClientOutcome {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason:
        "Supabase não configurado no servidor. Defina URL e chaves (ver documentação do projeto).",
    };
  }

  const url = getSupabaseUrlAtRuntime()?.trim();
  const rawEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = rawEnv ? normalizeSupabaseKeyForJwt(rawEnv) : "";

  if (!url) {
    return {
      ok: false,
      reason:
        "URL do Supabase em falta (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL).",
    };
  }

  if (!service) {
    return {
      ok: false,
      reason:
        "SUPABASE_SERVICE_ROLE_KEY em falta ou vazia. Na Vercel, copie a secret service_role (Project Settings → API).",
    };
  }

  const anonRaw = getSupabaseAnonKeyAtRuntime();
  if (anonRaw) {
    const anon = normalizeSupabaseKeyForJwt(anonRaw);
    if (anon && anon === service) {
      logSupabase(
        "createServiceRoleSupabase: SUPABASE_SERVICE_ROLE_KEY é idêntica à chave anon — rejeitada (cause típica de 42501).",
      );
      return {
        ok: false,
        reason:
          "SUPABASE_SERVICE_ROLE_KEY é igual à chave anon/public. No Supabase use a secret service_role (não copie a anon key).",
      };
    }
  }

  if (!service.startsWith("eyJ")) {
    logSupabase(
      "createServiceRoleSupabase: valor não parece um JWT Supabase (deve começar por eyJ).",
    );
    return {
      ok: false,
      reason:
        "SUPABASE_SERVICE_ROLE_KEY inválida (JWT Supabase começa com eyJ). Verifique copy/paste na Vercel (sem prefixo Bearer, sem HTML).",
    };
  }

  const role = peekSupabaseKeyJwtRole(service);
  if (role !== "service_role") {
    logSupabase(
      `createServiceRoleSupabase: JWT role="${role ?? "falha ao decodificar"}" — rejeitada (esperado service_role).`,
    );
    return {
      ok: false,
      reason: `SUPABASE_SERVICE_ROLE_KEY não é a secret service_role (role no JWT: ${role ?? "desconhecida"}). Supabase → Project Settings → API → secção service_role.`,
    };
  }

  return {
    ok: true,
    client: createClient(url, service, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

export function getSupabaseServerKeyMode(): "service" | "anon" | "none" {
  if (!isSupabaseConfigured()) {
    return "none";
  }

  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw?.trim()) {
    return "anon";
  }

  const service = normalizeSupabaseKeyForJwt(raw);
  if (!service.startsWith("eyJ")) {
    return "anon";
  }

  const role = peekSupabaseKeyJwtRole(service);
  return role === "service_role" ? "service" : "anon";
}

/**
 * Cliente Supabase com **única** a chave `SUPABASE_SERVICE_ROLE_KEY`.
 * Usar em repositórios e jobs internos (upserts, sync, leituras agregadoras).
 * Bypassa RLS — necessário porque estes caminhos não têm `auth.uid()` de utilizador.
 *
 * **Nunca** enviar esta chave ao browser.
 */
export function createServiceRoleSupabase(): SupabaseClient | null {
  const outcome = createServiceRoleSupabaseResult();
  return outcome.ok ? outcome.client : null;
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
  const serviceRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = serviceRaw ? normalizeSupabaseKeyForJwt(serviceRaw) : "";

  if (!url?.trim()) {
    return null;
  }

  const key =
    service && peekSupabaseKeyJwtRole(service) === "service_role"
      ? service
      : anon?.trim()
        ? normalizeSupabaseKeyForJwt(anon)
        : undefined;

  if (!key) {
    logSupabase(
      "URL definida mas nenhuma chave utilizável (defina SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY).",
    );
    return null;
  }

  const usingService =
    Boolean(service) && peekSupabaseKeyJwtRole(service) === "service_role";

  if (!usingService) {
    logSupabase(
      "SUPABASE_SERVICE_ROLE_KEY ausente ou inválida — usando ANON no createServerSupabase; writes na grelha com RLS devem usar createServiceRoleSupabaseResult().",
    );
  }

  return createClient(url.trim(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
