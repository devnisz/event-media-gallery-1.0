import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Entrar · Galeria",
  description: "Login do painel da galeria (Supabase Auth).",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configError = sp.error === "config";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_45%)]" />
      <div className="relative z-10 flex w-full flex-col items-center gap-10">
        <Link
          href={routes.home}
          className="text-sm font-semibold text-white/55 hover:text-white"
        >
          ← Voltar à galeria pública
        </Link>
        <Suspense
          fallback={
            <p className="text-sm text-white/50">Carregando formulário…</p>
          }
        >
          <LoginForm configError={configError} />
        </Suspense>
      </div>
    </main>
  );
}
