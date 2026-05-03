/**
 * Contratos futuros (sem implementação de login).
 * Mantém papéis e permissões centralizados para middleware e UI admin.
 */

export type UserId = string;

export enum UserRole {
  Owner = "owner",
  Staff = "staff",
  Viewer = "viewer",
}

export type Permission =
  | "admin:access"
  | "events:read"
  | "events:write"
  | "videos:read"
  | "videos:write";

export type AuthSession = {
  userId: UserId;
  role: UserRole;
} | null;
