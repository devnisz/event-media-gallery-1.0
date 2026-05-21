import type { AdminRole, UserStatus } from "@/lib/auth/profile-options";

const roleLabels: Record<AdminRole, string> = {
  master_admin: "Administrador",
  customer: "Cliente",
  operator: "Operador",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
};

export function getRoleLabel(role: string): string {
  return roleLabels[role as AdminRole] ?? role;
}

export function getStatusLabel(status: string): string {
  return statusLabels[status as UserStatus] ?? status;
}
