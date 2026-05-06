import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getSupabaseAnonKeyAtRuntime,
  getSupabaseUrlAtRuntime,
} from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = getSupabaseUrlAtRuntime();
  const anon = getSupabaseAnonKeyAtRuntime();
  const pathname = request.nextUrl.pathname;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const target = new URL(request.url);
    target.pathname =
      pathname === "/admin"
        ? "/dashboard"
        : `/dashboard${pathname.slice("/admin".length)}`;

    return NextResponse.redirect(target);
  }

  if (!url?.trim() || !anon?.trim()) {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(
        new URL("/login?error=config", request.url),
      );
    }

    return response;
  }

  const supabase = createServerClient(url.trim(), anon.trim(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set(
        "next",
        `${pathname}${request.nextUrl.search ?? ""}`,
      );

      return NextResponse.redirect(login);
    }
  }

  if (pathname === "/login" && user) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const dest =
      nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Atualiza sessão Supabase e protege `/dashboard`.
     * Ignora estáticos do Next e assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
