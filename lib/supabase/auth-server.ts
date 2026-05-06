/**
 * Cliente Supabase com contexto de sessão do usuário (cookies).
 * Usar em Server Components, Route Handlers e Server Actions — nunca expor service_role ao browser.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

export async function createAuthServerSupabase() {
  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();

  if (!url?.trim() || !anon?.trim()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url.trim(), anon.trim(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* chamadas em RSC somente-leitura — refresh ocorre no middleware / route */
        }
      },
    },
  });
}
