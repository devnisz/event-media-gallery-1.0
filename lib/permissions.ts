import { UserRole, type Permission } from "@/lib/auth/types";

/** Matriz estática — substituível por claims do Supabase no futuro. */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.Owner]: [
    "admin:access",
    "events:read",
    "events:write",
    "videos:read",
    "videos:write",
  ],
  [UserRole.Staff]: [
    "admin:access",
    "events:read",
    "events:write",
    "videos:read",
    "videos:write",
  ],
  [UserRole.Viewer]: ["events:read", "videos:read"],
};

export function roleHasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
