"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminUserSummary } from "@/lib/admin/queries";
import { formatDateTime, formatStorage } from "@/lib/admin/format";
import { getRoleLabel, getStatusLabel } from "@/lib/admin/labels";
import { RoleBadge, StatusBadge } from "@/components/admin/admin-badges";

type AdminUsersTableProps = {
  users: AdminUserSummary[];
  storageSizeAvailable: boolean;
};

export function AdminUsersTable({
  users,
  storageSizeAvailable,
}: AdminUsersTableProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [
        user.email,
        user.name,
        user.role,
        user.status,
        getRoleLabel(user.role),
        getStatusLabel(user.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, users]);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">Usuários</h2>
          <p className="mt-1 text-sm text-white/45">
            Clique em um usuário para ver eventos e gerenciar o perfil.
          </p>
        </div>
        <label className="w-full max-w-sm text-sm font-semibold text-white/65">
          Buscar por e-mail
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="usuario@empresa.com"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-6 py-4 font-bold">E-mail</th>
              <th className="px-6 py-4 font-bold">Perfil</th>
              <th className="px-6 py-4 font-bold">Situação</th>
              <th className="px-6 py-4 font-bold">Eventos</th>
              <th className="px-6 py-4 font-bold">Mídias</th>
              <th className="px-6 py-4 font-bold">Armazenamento</th>
              <th className="px-6 py-4 font-bold">Último upload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="transition hover:bg-white/[0.04]">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/users/${encodeURIComponent(user.id)}`}
                    className="font-bold text-amber-100 hover:text-amber-200"
                  >
                    {user.email}
                  </Link>
                  {user.name ? (
                    <p className="mt-1 text-xs text-white/40">{user.name}</p>
                  ) : null}
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-6 py-4 text-white/70">{user.eventCount}</td>
                <td className="px-6 py-4 text-white/70">{user.mediaCount}</td>
                <td className="px-6 py-4 text-white/70">
                  {formatStorage(user.storageBytes, storageSizeAvailable)}
                </td>
                <td className="px-6 py-4 text-white/70">
                  {formatDateTime(user.lastUploadAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="border-t border-white/10 px-6 py-8 text-sm text-white/50">
          Nenhum usuário encontrado para esta busca.
        </p>
      ) : null}
    </section>
  );
}
