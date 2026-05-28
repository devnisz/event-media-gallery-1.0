import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackground } from "@/components/public/ambient-background";
import { LandingHeroPreview } from "@/components/public/landing-hero-preview";
import { routes } from "@/lib/routes";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "MidiaUp — Galerias ao vivo para eventos",
  description:
    "Fotos e vídeos do seu evento, instantaneamente na mão dos convidados via QR Code.",
};

const FEATURES = [
  { icon: "⚡", label: "Tempo real", hint: "Tudo aparece na hora" },
  { icon: "📲", label: "Compartilhe", hint: "QR Code único do evento" },
  { icon: "☁️", label: "Sem limite", hint: "Envios ilimitados" },
  { icon: "🛡️", label: "Privado", hint: "Só quem tem acesso vê" },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden px-5 py-6 text-white sm:px-8 sm:py-10 lg:px-12 2xl:px-20">
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-14 lg:min-h-[calc(100dvh-5rem)] lg:flex-row lg:items-center lg:gap-16">
        <section className="animate-rise flex flex-1 flex-col justify-center gap-8 lg:max-w-xl">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-500 text-lg font-black text-slate-950 shadow-[0_12px_40px_rgba(251,191,36,0.28)]">
              M
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              MidiaUp
            </span>
          </div>

          <div className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-200">
              Galerias ao vivo para eventos
            </p>
            <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-5xl xl:text-6xl">
              Seu evento.{" "}
              <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-fuchsia-400 bg-clip-text text-transparent">
                Ao vivo
              </span>{" "}
              na mão dos convidados.
            </h1>
            <p className="max-w-lg text-base leading-7 text-white/60 sm:text-lg">
              Vídeos, fotos e experiências compartilhadas em tempo real através
              de QR Code.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={routes.login}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-10 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(251,191,36,0.32)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98]"
            >
              <span aria-hidden>🔒</span>
              Acessar painel
            </Link>
            <p className="flex items-center gap-2 text-sm text-white/45">
              <span className="text-emerald-400" aria-hidden>
                ✓
              </span>
              Seguro, privado e exclusivo para cada evento.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEATURES.map((feature) => (
              <li
                key={feature.label}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 backdrop-blur-sm"
              >
                <span className="text-base" aria-hidden>
                  {feature.icon}
                </span>
                <p className="mt-1 text-xs font-bold text-white/85">
                  {feature.label}
                </p>
                <p className="mt-0.5 text-[0.65rem] leading-4 text-white/40">
                  {feature.hint}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="animate-rise flex flex-1 items-center justify-center [animation-delay:80ms]"
          aria-label="Prévia da galeria ao vivo"
        >
          <LandingHeroPreview />
        </section>
      </div>
    </main>
  );
}
