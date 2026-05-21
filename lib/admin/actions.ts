"use server";

import { revalidatePath } from "next/cache";
import { getMasterAdminAccess } from "@/lib/auth/admin";
import {
  isAdminRole,
  isUserStatus,
  type AdminRole,
  type UserStatus,
} from "@/lib/auth/profile-options";
import { createServiceRoleSupabaseResult } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export type UpdateUserProfileState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ProfileRoleStatus = {
  role: string | null;
  status: string | null;
};

const initialErrorState = (message: string): UpdateUserProfileState => ({
  status: "error",
  message,
});

async function hasAnotherActiveMasterAdmin(
  targetUserId: string,
): Promise<boolean> {
  const service = createServiceRoleSupabaseResult();

  if (!service.ok) {
    throw new Error(service.reason);
  }

  const { data, error } = await service.client
    .from("profiles")
    .select("id")
    .eq("role", "master_admin")
    .eq("status", "active")
    .neq("id", targetUserId)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function updateUserProfileAction(
  _prevState: UpdateUserProfileState,
  formData: FormData,
): Promise<UpdateUserProfileState> {
  const access = await getMasterAdminAccess(routes.admin);

  if (!access.ok) {
    return initialErrorState(access.reason);
  }

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!targetUserId) {
    return initialErrorState("Usuário inválido.");
  }

  if (!isAdminRole(role)) {
    return initialErrorState("Role inválida.");
  }

  if (!isUserStatus(status)) {
    return initialErrorState("Status inválido.");
  }

  const service = createServiceRoleSupabaseResult();

  if (!service.ok) {
    return initialErrorState(service.reason);
  }

  const { data: current, error: currentError } = await service.client
    .from("profiles")
    .select("role,status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (currentError) {
    return initialErrorState("Não foi possível ler o perfil atual.");
  }

  const currentProfile = current as ProfileRoleStatus | null;
  const currentlyActiveMaster =
    currentProfile?.role === "master_admin" &&
    (currentProfile.status ?? "active") === "active";
  const willRemainActiveMaster = role === "master_admin" && status === "active";

  if (currentlyActiveMaster && !willRemainActiveMaster) {
    try {
      const hasBackupMaster = await hasAnotherActiveMasterAdmin(targetUserId);

      if (!hasBackupMaster) {
        return initialErrorState(
          "Não é permitido remover ou suspender o último master_admin ativo.",
        );
      }
    } catch {
      return initialErrorState(
        "Não foi possível validar a regra do último master_admin.",
      );
    }
  }

  const payload: {
    id: string;
    role: AdminRole;
    status: UserStatus;
    email?: string;
    updated_at: string;
  } = {
    id: targetUserId,
    role,
    status,
    updated_at: new Date().toISOString(),
  };

  if (email) {
    payload.email = email;
  }

  const { error } = await service.client.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    return initialErrorState("Não foi possível salvar as alterações.");
  }

  revalidatePath(routes.admin);
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath(routes.dashboard);

  return {
    status: "success",
    message: "Usuário atualizado com sucesso.",
  };
}
