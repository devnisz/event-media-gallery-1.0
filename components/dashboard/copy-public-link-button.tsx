"use client";

import { useState } from "react";

type CopyPublicLinkButtonProps = {
  value: string;
};

export function CopyPublicLinkButton({ value }: CopyPublicLinkButtonProps) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Link copiado.");
    } catch {
      setMessage("Não foi possível copiar.");
    }

    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-amber-100"
      >
        Copiar link público
      </button>
      {message ? (
        <p className="text-sm font-semibold text-emerald-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
