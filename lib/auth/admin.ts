import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createAuthServerSupabase } from "@/lib/supabase/auth-server";
import { createServiceRoleSupabaseResult } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: "master_admin" | "customer" | "operator" | string;
  status: "active" | "inactive" | "suspended" | string;
};

export type MasterAdminSession = {
  user: User;
  profile: AdminProfile;
};

export type MasterAdminAccess =
  | { ok: true; session: MasterAdminSession }
  | { ok: false; reason: string };

export async function getMasterAdminAccess(
  nextPath = "/admin",
): Promise<MasterAdminAccess> {
  const auth = await createAuthServerSupabase();

  if (!auth) {
    redirect(`/login?error=config&next=${encodeURIComponent(nextPath)}`);
  }

  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const service = createServiceRoleSupabaseResult();

  if (!service.ok) {
    return {
      ok: false,
      reason: service.reason,
    };
  }

  const { data, error } = await service.client
    .from("profiles")
    .select("id,email,name,role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason:
        "Não foi possível validar o perfil master_admin. Confirme se o SQL de profiles foi executado.",
    };
  }

  if (!data || data.role !== "master_admin" || data.status !== "active") {
    return {
      ok: false,
      reason: "Acesso restrito a usuários master_admin ativos.",
    };
  }

  return {
    ok: true,
    session: {
      user,
      profile: {
        id: String(data.id),
        email: typeof data.email === "string" ? data.email : null,
        name: typeof data.name === "string" ? data.name : null,
        role: String(data.role),
        status: String(data.status),
      },
    },
  };
}
