/**
 * Contratos de papéis (claims customizados / futuras orgs).
 * Autenticação base: Supabase Auth (`auth.users` + sessão em cookies).
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
