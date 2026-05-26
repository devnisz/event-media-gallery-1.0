import { revalidatePath } from "next/cache";
import { createAdminUser } from "@/lib/admin/create-user";
import { assertMasterAdminForApi } from "@/lib/auth/admin";
import { isAdminRole } from "@/lib/auth/profile-options";
import { routes } from "@/lib/routes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const access = await assertMasterAdminForApi();

    if (access instanceof Response) {
      return access;
    }

    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
      requirePasswordChange?: unknown;
    };

    const name = typeof body.name === "string" ? body.name : "";
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";

    if (!isAdminRole(role)) {
      return Response.json({ error: "Perfil inválido." }, { status: 400 });
    }

    const result = await createAdminUser({
      name,
      email,
      password,
      role,
      requirePasswordChange: body.requirePasswordChange === true,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidatePath(routes.admin);
    revalidatePath(`${routes.admin}/users`);

    return Response.json({ ok: true, user: result.user }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_CREATE_USER] erro", error);

    return Response.json(
      { error: "Não foi possível criar o usuário." },
      { status: 500 },
    );
  }
}
