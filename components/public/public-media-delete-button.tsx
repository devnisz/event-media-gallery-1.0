"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type PublicMediaDeleteButtonProps = {
  mediaId: string;
  title: string;
  eventHref: string;
  requireDeletePin: boolean;
  appearance?: "button" | "menu";
  onMenuAction?: () => void;
};

export function PublicMediaDeleteButton({
  mediaId,
  title,
  eventHref,
  requireDeletePin,
  appearance = "button",
  onMenuAction,
}: PublicMediaDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [deletePin, setDeletePin] = useState("");

  async function deleteMedia(pin: string) {
    const confirmed = window.confirm(
      `Excluir "${title}" da galeria?\n\nA mídia será removida da experiência pública do evento.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/media/${encodeURIComponent(mediaId)}/public-delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível excluir a mídia.");
      }

      setPinDialogOpen(false);
      setDeletePin("");
      router.push(eventHref);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível excluir a mídia.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function startDelete() {
    onMenuAction?.();

    if (requireDeletePin) {
      setError("");
      setDeletePin("");
      setPinDialogOpen(true);
      return;
    }

    void deleteMedia("");
  }

  const isMenu = appearance === "menu";

  function submitPinDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pin = deletePin.trim();

    if (!/^\d{4,8}$/.test(pin)) {
      setError("Informe um PIN de 4 a 8 dígitos.");
      return;
    }

    void deleteMedia(pin);
  }

  return (
    <div className={isMenu ? "" : "space-y-3"}>
      <button
        type="button"
        role={isMenu ? "menuitem" : undefined}
        disabled={isDeleting}
        onClick={startDelete}
        className={
          isMenu
            ? "flex w-full items-center px-4 py-3 text-left text-sm font-semibold text-red-200/90 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex min-h-11 items-center justify-center rounded-full border border-red-300/25 bg-transparent px-6 text-sm font-semibold text-red-200/80 transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isDeleting ? "Excluindo..." : "Excluir da galeria"}
      </button>
      {error && !isMenu ? (
        <p className="text-sm font-semibold leading-5 text-red-200">{error}</p>
      ) : null}
      {pinDialogOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`PIN para excluir ${title}`}
        >
          <form
            onSubmit={submitPinDelete}
            className="w-full max-w-sm rounded-[2rem] border border-white/12 bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
              Confirmação necessária
            </p>
            <h3 className="mt-3 text-2xl font-black">Informe o PIN</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Este evento exige PIN para excluir mídias da galeria pública.
            </p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={4}
              maxLength={8}
              value={deletePin}
              disabled={isDeleting}
              onChange={(event) => setDeletePin(event.target.value)}
              placeholder="4 a 8 dígitos"
              className="mt-5 min-h-12 w-full rounded-2xl border border-white/12 bg-black/40 px-4 text-lg font-semibold outline-none ring-amber-300/30 placeholder:text-white/35 focus:ring-4 disabled:opacity-60"
            />
            {error ? (
              <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setPinDialogOpen(false);
                  setDeletePin("");
                  setError("");
                }}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="flex-1 rounded-full bg-red-500 py-3 text-sm font-black text-white shadow-lg hover:bg-red-400 disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
