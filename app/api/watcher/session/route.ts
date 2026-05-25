import { createWatcherSupabaseClient } from "@/lib/watcher/auth";
import { isUserSuspended } from "@/lib/auth/admin";

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

function publicSessionPayload(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type: string;
}) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    tokenType: session.token_type,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = createWatcherSupabaseClient();

    if (!supabase) {
      return Response.json(
        { ok: false, error: "Autenticacao da Gallery nao configurada." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as LoginBody;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return Response.json(
        { ok: false, error: "E-mail e senha sao obrigatorios." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return Response.json(
        { ok: false, error: "Credenciais invalidas." },
        { status: 401 },
      );
    }

    if (await isUserSuspended(data.user.id)) {
      return Response.json(
        { ok: false, error: "Usuario suspenso." },
        { status: 403 },
      );
    }

    return Response.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: publicSessionPayload(data.session),
    });
  } catch (error) {
    console.error("[WATCHER_SESSION] erro no login", error);

    return Response.json(
      { ok: false, error: "Erro interno ao autenticar." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createWatcherSupabaseClient();

    if (!supabase) {
      return Response.json(
        { ok: false, error: "Autenticacao da Gallery nao configurada." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as RefreshBody;
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

    if (!refreshToken) {
      return Response.json(
        { ok: false, error: "refreshToken obrigatorio." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return Response.json(
        { ok: false, error: "Sessao expirada. Faca login novamente." },
        { status: 401 },
      );
    }

    if (await isUserSuspended(data.user.id)) {
      return Response.json(
        { ok: false, error: "Usuario suspenso." },
        { status: 403 },
      );
    }

    return Response.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: publicSessionPayload(data.session),
    });
  } catch (error) {
    console.error("[WATCHER_SESSION] erro ao renovar sessao", error);

    return Response.json(
      { ok: false, error: "Erro interno ao renovar sessao." },
      { status: 500 },
    );
  }
}
