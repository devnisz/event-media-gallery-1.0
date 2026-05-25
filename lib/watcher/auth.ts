import { createClient, type User } from "@supabase/supabase-js";
import { isUserSuspended } from "@/lib/auth/admin";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

export type WatcherAuthUser = Pick<User, "id" | "email">;

export function createWatcherSupabaseClient() {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();

  if (!url?.trim() || !anon?.trim()) {
    return null;
  }

  return createClient(url.trim(), anon.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

export async function getWatcherBearerUser(
  request: Request,
): Promise<WatcherAuthUser | Response> {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return Response.json(
      { ok: false, error: "Token de acesso ausente." },
      { status: 401 },
    );
  }

  const supabase = createWatcherSupabaseClient();

  if (!supabase) {
    return Response.json(
      { ok: false, error: "Autenticacao da Gallery nao configurada." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return Response.json(
      { ok: false, error: "Sessao invalida ou expirada." },
      { status: 401 },
    );
  }

  if (await isUserSuspended(user.id)) {
    return Response.json(
      { ok: false, error: "Usuario suspenso." },
      { status: 403 },
    );
  }

  return { id: user.id, email: user.email };
}
