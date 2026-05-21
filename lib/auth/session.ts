import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createAuthServerSupabase } from "@/lib/supabase/auth-server";
import { isUserSuspended } from "@/lib/auth/admin";

export async function requireSessionUser(): Promise<User> {
  const supabase = await createAuthServerSupabase();

  if (!supabase) {
    redirect("/login?error=config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (await isUserSuspended(user.id)) {
    redirect("/login?error=suspended");
  }

  return user;
}

export async function getOptionalSessionUser(): Promise<User | null> {
  const supabase = await createAuthServerSupabase();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (await isUserSuspended(user.id))) {
    return null;
  }

  return user;
}

/**
 * Para Route Handlers: retorna usuário ou `Response` de erro (401/503).
 */
export async function getRouteHandlerUser(): Promise<User | Response> {
  const supabase = await createAuthServerSupabase();

  if (!supabase) {
    return Response.json(
      { error: "Autenticação não configurada (Supabase URL/anon)." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (await isUserSuspended(user.id)) {
    return Response.json({ error: "Usuário suspenso." }, { status: 403 });
  }

  return user;
}
