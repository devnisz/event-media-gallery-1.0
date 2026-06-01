"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type CopyPublicLinkButtonProps = {
  value: string;
  label?: string;
  compact?: boolean;
};

export function CopyPublicLinkButton({
  value,
  label = "Copiar link público",
  compact = false,
}: CopyPublicLinkButtonProps) {
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
    <div className={cn(compact ? "inline-flex" : "flex flex-wrap items-center gap-3")}>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-white text-sm font-black text-slate-950 transition hover:bg-amber-100",
          compact
            ? "min-h-10 flex-1 px-4 sm:flex-none sm:min-w-[7.5rem]"
            : "min-h-11 px-5",
        )}
      >
        {label}
      </button>
      {message && !compact ? (
        <p className="text-sm font-semibold text-emerald-200" role="status">
          {message}
        </p>
      ) : null}
      {message && compact ? (
        <span className="sr-only" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
