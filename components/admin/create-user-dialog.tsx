"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { AdminUserSummary } from "@/lib/admin/queries";
import { getRoleLabel } from "@/lib/admin/labels";
import { ADMIN_ROLES, type AdminRole } from "@/lib/auth/profile-options";

type CreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (user: AdminUserSummary) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
  onError,
  onSuccess,
}: CreateUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("customer");
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      dialog.showModal();
      return;
    }

    dialog.close();
  }, [open]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("customer");
    setRequirePasswordChange(false);
    setError("");
  }

  function handleClose() {
    if (loading) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          requirePasswordChange,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        user?: AdminUserSummary;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Não foi possível criar o usuário.");
      }

      onCreated(payload.user);
      onSuccess("Usuário criado com sucesso.");
      resetForm();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar o usuário.";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 z-[120] w-[min(94vw,28rem)] max-h-[92dvh] overflow-y-auto rounded-[2rem] border border-white/12 bg-[#070712]/96 p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl open:animate-rise"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (event.key === "Escape") {
          handleClose();
        }
      }}
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="relative px-8 pb-10 pt-10">
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="absolute -right-12 bottom-0 h-52 w-52 rounded-full bg-fuchsia-500/25 blur-3xl" />
        </div>

        <div className="relative space-y-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-200">
              Novo usuário
            </p>
            <h2 id={titleId} className="mt-2 text-2xl font-black">
              Criar conta de acesso
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              A conta é criada no Supabase Auth e no perfil interno da plataforma.
            </p>
          </header>

          <label className="block text-sm font-semibold text-white/75">
            Nome
            <input
              autoComplete="name"
              disabled={loading}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Maria Silva"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50"
            />
          </label>

          <label className="block text-sm font-semibold text-white/75">
            E-mail
            <input
              type="email"
              autoComplete="off"
              disabled={loading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="cliente@empresa.com"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50"
            />
          </label>

          <label className="block text-sm font-semibold text-white/75">
            Senha temporária
            <input
              type="password"
              autoComplete="new-password"
              disabled={loading}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50"
            />
          </label>

          <label className="block text-sm font-semibold text-white/75">
            Perfil
            <select
              disabled={loading}
              value={role}
              onChange={(event) => setRole(event.target.value as AdminRole)}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50"
            >
              {ADMIN_ROLES.map((option) => (
                <option key={option} value={option}>
                  {getRoleLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
            <input
              type="checkbox"
              checked={requirePasswordChange}
              disabled={loading}
              onChange={(event) => setRequirePasswordChange(event.target.checked)}
              className="mt-1 size-5 accent-amber-300"
            />
            <span>
              <span className="block font-bold">Exigir troca de senha no primeiro login</span>
              <span className="mt-1 block text-sm leading-6 text-white/50">
                Marca a conta para troca obrigatória de senha no metadata do usuário.
              </span>
            </span>
          </label>

          {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-white py-3 text-sm font-black text-slate-950 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-900" />
                  Criando…
                </span>
              ) : (
                "Criar usuário"
              )}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
