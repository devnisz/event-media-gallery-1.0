import type { AdminUserSummary } from "@/lib/admin/queries";
import {
  isAdminRole,
  type AdminRole,
} from "@/lib/auth/profile-options";
import { createServiceRoleSupabaseResult } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type CreateAdminUserInput = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  requirePasswordChange?: boolean;
};

export type CreateAdminUserResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; status: number; error: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isDuplicateEmailError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("duplicate") ||
    normalized.includes("user already exists")
  );
}

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  const role = input.role;

  if (!name) {
    return { ok: false, status: 400, error: "Informe o nome do usuário." };
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, status: 400, error: "Informe um e-mail válido." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (!isAdminRole(role)) {
    return { ok: false, status: 400, error: "Perfil inválido." };
  }

  const service = createServiceRoleSupabaseResult();

  if (!service.ok) {
    return { ok: false, status: 503, error: service.reason };
  }

  const { data: authData, error: authError } =
    await service.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        ...(input.requirePasswordChange
          ? { require_password_change: true }
          : {}),
      },
    });

  if (authError || !authData.user) {
    const message = authError?.message ?? "Não foi possível criar o usuário.";

    if (isDuplicateEmailError(message)) {
      return {
        ok: false,
        status: 409,
        error: "Já existe um usuário com este e-mail.",
      };
    }

    return { ok: false, status: 400, error: message };
  }

  const authUser = authData.user;
  const now = new Date().toISOString();
  const { error: profileError } = await service.client.from("profiles").upsert(
    {
      id: authUser.id,
      email,
      name,
      role,
      status: "active",
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await service.client.auth.admin.deleteUser(authUser.id).catch(() => undefined);

    return {
      ok: false,
      status: 500,
      error: "Usuário criado no Auth, mas falhou ao salvar o perfil interno.",
    };
  }

  return {
    ok: true,
    user: {
      id: authUser.id,
      email: authUser.email ?? email,
      name,
      role,
      status: "active",
      createdAt: authUser.created_at ?? now,
      eventCount: 0,
      mediaCount: 0,
      storageBytes: 0,
      lastUploadAt: null,
    },
  };
}
