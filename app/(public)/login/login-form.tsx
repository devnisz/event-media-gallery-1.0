"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent as ReactFormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type LoginFormProps = {
  configError: boolean;
};

export function LoginForm({ configError }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const configMessage = configError
    ? "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayError = configMessage || error;

  async function handleSubmit(e: ReactFormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createBrowserSupabase();

    if (!supabase) {
      setError("Cliente Supabase indisponível (variáveis públicas ausentes).");
      setLoading(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
    >
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Entrar
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Use a conta configurada no Supabase Auth (e-mail e senha).
        </p>
      </div>

      {displayError ? (
        <p
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {displayError}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-semibold text-white/80">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold text-white/80">
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-8 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_18px_70px_rgba(251,191,36,0.32)] transition hover:brightness-105 disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
