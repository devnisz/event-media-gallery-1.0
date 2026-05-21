export const ADMIN_ROLES = ["master_admin", "customer", "operator"] as const;
export const USER_STATUSES = ["active", "suspended"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus);
}
