"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateUserProfileAction,
  type UpdateUserProfileState,
} from "@/lib/admin/actions";
import { getRoleLabel, getStatusLabel } from "@/lib/admin/labels";
import { ADMIN_ROLES, USER_STATUSES } from "@/lib/auth/profile-options";

type UserProfileManagementFormProps = {
  userId: string;
  email: string;
  currentRole: string;
  currentStatus: string;
};

const initialState: UpdateUserProfileState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-6 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function UserProfileManagementForm({
  userId,
  email,
  currentRole,
  currentStatus,
}: UserProfileManagementFormProps) {
  const [state, formAction] = useActionState(
    updateUserProfileAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="email" value={email} />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
          Gerenciamento do usuário
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight">
          Perfil e situação
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Alterações são salvas no servidor e validadas para manter pelo menos
          um administrador ativo.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-white/75">
          Perfil
          <select
            name="role"
            defaultValue={currentRole}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
          >
            {ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-white/75">
          Situação
          <select
            name="status"
            defaultValue={currentStatus === "suspended" ? "suspended" : "active"}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
          >
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <SubmitButton />
        {state.message ? (
          <p
            className={
              state.status === "success"
                ? "text-sm font-semibold text-emerald-200"
                : "text-sm font-semibold text-rose-200"
            }
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
