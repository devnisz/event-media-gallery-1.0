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

/**
 * **Browser:** só `NEXT_PUBLIC_*` é exposto no bundle; o Next exige acesso
 * **estático** a `process.env.NEXT_PUBLIC_…` para injetar o valor. Usar
 * `process.env[nomeDinâmico]` quebra o login e o Realtime no cliente.
 *
 * **Servidor:** também lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` (sem prefixo),
 * úteis na Vercel quando só estão definidas no runtime do Node.
 */
export function getSupabaseUrlAtRuntime(): string | undefined {
  const nextPublic = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (nextPublic) {
    return nextPublic;
  }
  return process.env.SUPABASE_URL?.trim() || undefined;
}

export function getSupabaseAnonKeyAtRuntime(): string | undefined {
  const nextPublic = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (nextPublic) {
    return nextPublic;
  }
  return process.env.SUPABASE_ANON_KEY?.trim() || undefined;
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

/**
 * Deploy na Vercel: filesystem do serverless é só leitura (exceto /tmp efémero);
 * `data/events.json` não existe como pasta gravável → ENOENT em `open`.
 */
export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Quando pode gravar `data/*.json` de forma suportada.
 * - Nunca na Vercel (usar só Supabase em produção).
 * - Sem Supabase: sim (modo ficheiro local / dev).
 * - Com Supabase fora da Vercel: só se `GALLERY_DUAL_WRITE_LEGACY_JSON` estiver ativo.
 */
export function shouldPersistLegacyJsonFiles(): boolean {
  if (isVercelDeployment()) {
    return false;
  }

  if (!isSupabaseConfigured()) {
    return true;
  }

  return shouldDualWriteLegacyJson();
}

export function logLegacyJsonWriteSkipped(reason: string): void {
  logRepository(
    `[LEGACY_JSON] escrita ignorada (${reason}). Fonte: Supabase apenas.`,
  );
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
