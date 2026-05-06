import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackground } from "@/components/public/ambient-background";
import { routes } from "@/lib/routes";

/**
 * Landing institucional: sem listgem global de eventos (modelo SaaS).
 * Conteúdo público por evento permanece em `/evento/[slug]` e `/video/[id]`.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Galerias de eventos",
  description:
    "Plataforma para contratantes gerirem galerias privadas. Convidados acedem apenas pelo link ou QR code partilhado.",
};

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden px-5 py-8 text-white sm:px-8 lg:px-12 2xl:px-20">
      <AmbientBackground />

      <section className="mx-auto flex w-full max-w-[900px] flex-col gap-12 py-10 sm:py-16">
        <header className="animate-rise flex flex-col gap-6 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-amber-200">
            Galerias privadas por evento
          </p>
          <h1 className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-6xl xl:text-7xl">
            O momento certo, partilhado da forma certa.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/68 sm:text-xl sm:leading-9">
            Cada celebração tem a sua galeria. Os convidados acedem só com o
            link ou o código QR que o organizador envia — sem listagem pública
            de eventos.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={routes.login}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-10 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(251,191,36,0.32)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98]"
            >
              Área do contratante
            </Link>
            <p className="text-sm text-white/50 sm:max-w-xs">
              Já tem conta? Entre para criar eventos, credenciais do uploader e
              galerias.
            </p>
          </div>
        </header>

        <div className="animate-rise grid gap-6 rounded-[2.5rem] border border-white/10 bg-black/25 p-8 backdrop-blur-xl sm:p-10 [animation-delay:60ms]">
          <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/90">
            Convidado
          </h2>
          <p className="text-lg leading-8 text-white/75">
            Utilize o <strong className="font-semibold text-white">link</strong>{" "}
            ou o <strong className="font-semibold text-white">QR code</strong> que
            recebeu. A galeria abre diretamente no evento — não é necessário
            navegar por uma lista de festas.
          </p>
        </div>
      </section>
    </main>
  );
}
