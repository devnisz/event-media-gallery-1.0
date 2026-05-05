/**
 * Configuração central Supabase + logs padronizados para migração JSON → Postgres.
 * Vercel: definir variáveis no dashboard do projeto.
 *
 * **Servidor (Route Handlers / Node):** `NEXT_PUBLIC_*` pode ser embutido no bundle no
 * `next build` com valor vazio se as envs não estiverem disponíveis naquele momento.
 * Use `SUPABASE_URL` e `SUPABASE_ANON_KEY` (mesmos valores, sem prefixo público) no Vercel
 * para leitura garantida em runtime no servidor.
 *
 * **Browser:** apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` existem
 * no bundle; `SUPABASE_*` sem prefixo não é enviado ao cliente pelo Next.js.
 */

/** Diagnóstico no browser ao carregar este módulo (uma vez por sessão da aba). */
if (typeof window !== "undefined") {
  console.log(
    "[SUPABASE CONFIG] NEXT_PUBLIC_SUPABASE_URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  console.log(
    "[SUPABASE CONFIG] NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function firstNonEmptyTrimmed(
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();

    if (v) {
      return v;
    }
  }

  return undefined;
}

/**
 * URL do projeto Supabase, lida no momento da chamada (sem cache em módulo).
 * Ordem: NEXT_PUBLIC_* depois espelho só-servidor (runtime na Vercel).
 */
export function getSupabaseUrlAtRuntime(): string | undefined {
  return firstNonEmptyTrimmed(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  );
}

/**
 * Chave anon, lida no momento da chamada (sem cache em módulo).
 */
export function getSupabaseAnonKeyAtRuntime(): string | undefined {
  return firstNonEmptyTrimmed(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  );
}

/**
 * True se o servidor Next pode falar com o Supabase (URL + pelo menos uma chave).
 * Aceita só `SUPABASE_SERVICE_ROLE_KEY` (sem anon) para leituras/escritas no Node;
 * o browser continua precisando da anon em `createBrowserSupabase`.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return Boolean(url && (anon || service));
}

/** Log temporário de diagnóstico (Vercel runtime vs build). */
export function logSupabaseEnvCheck(): void {
  console.log("[ENV CHECK]", {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serverUrl: !!process.env.SUPABASE_URL,
    serverAnon: !!process.env.SUPABASE_ANON_KEY,
    resolvedUrl: Boolean(getSupabaseUrlAtRuntime()),
    resolvedAnon: Boolean(getSupabaseAnonKeyAtRuntime()),
    configured: isSupabaseConfigured(),
  });
}

function maskHost(url: string): string {
  try {
    const u = new URL(url);

    return `${u.protocol}//${u.host}/…`;
  } catch {
    return "(URL inválida)";
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) {
    return "***";
  }

  return `…${key.slice(-6)}`;
}

/** Diagnóstico de env sem vazar segredos (apenas previews mascarados). */
export function getSupabaseEnvDiagnostics(): {
  configured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRole: boolean;
  urlPreview?: string;
  anonKeyPreview?: string;
} {
  const url = getSupabaseUrlAtRuntime() ?? "";
  const anon = getSupabaseAnonKeyAtRuntime() ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  return {
    configured: Boolean(url && (anon || service)),
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anon),
    hasServiceRole: Boolean(service),
    urlPreview: url ? maskHost(url) : undefined,
    anonKeyPreview: anon ? maskKey(anon) : undefined,
  };
}

/** Espelha escrita no `events.json` / `videos.json` além do Supabase (transição). */
export function shouldDualWriteLegacyJson(): boolean {
  const v = process.env.GALLERY_DUAL_WRITE_LEGACY_JSON?.trim().toLowerCase();

  return v === "1" || v === "true" || v === "yes";
}

export function logSupabase(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SUPABASE] ${message}`, detail);
  } else {
    console.log(`[SUPABASE] ${message}`);
  }
}

export function logRepository(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[REPOSITORY] ${message}`, detail);
  } else {
    console.log(`[REPOSITORY] ${message}`);
  }
}

export function logMigration(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[MIGRATION] ${message}`, detail);
  } else {
    console.log(`[MIGRATION] ${message}`);
  }
}

export function logFallback(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FALLBACK] ${message}`, detail);
  } else {
    console.log(`[FALLBACK] ${message}`);
  }
}
