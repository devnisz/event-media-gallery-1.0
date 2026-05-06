import { revalidatePath } from "next/cache";
import { createEventRecordWithPersistence } from "@/services/eventService";
import { getRouteHandlerUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const body = (await request.json()) as { name?: string };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    console.log("[EVENT_CREATE] POST recebido", {
      nameLength: name.length,
      hasName: Boolean(name),
      ownerUserIdTail: userOrRes.id.slice(-8),
    });

    if (!name) {
      return Response.json(
        { error: "Informe um nome para o evento." },
        { status: 400 },
      );
    }

    const { event, persistence } = await createEventRecordWithPersistence(
      name,
      { ownerUserId: userOrRes.id },
    );

    console.log("[EVENT_CREATE] sucesso", {
      eventId: event.id,
      slug: event.slug,
      persistenceBranch: persistence.branch,
      repositoryLabel: persistence.repositoryLabel,
      usedFallbackJson: persistence.usedFallbackJson,
      keyMode: persistence.keyMode,
      supabaseClientCreated: persistence.supabaseClientCreated,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/evento/${event.slug}`);

    return Response.json({ ok: true, event, persistence });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[EVENT_CREATE] erro ao criar evento", {
      message,
      stack,
      error,
    });

    return Response.json(
      {
        error: "Nao foi possivel criar o evento.",
        errorDetail: message,
        errorStack: stack ?? null,
      },
      { status: 500 },
    );
  }
}
