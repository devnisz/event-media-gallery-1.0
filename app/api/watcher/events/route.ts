import { revalidatePath } from "next/cache";
import { getWatcherBearerUser } from "@/lib/watcher/auth";
import {
  createEventRecordWithPersistence,
  readEvents,
} from "@/services/eventService";

export async function GET(request: Request) {
  try {
    const userOrRes = await getWatcherBearerUser(request);

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const events = await readEvents();
    const ownedEvents = events
      .filter((event) => event.ownerUserId === userOrRes.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((event) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        uploadToken: event.uploadToken,
        videosCount:
          typeof event.videosCount === "number" ? event.videosCount : 0,
      }));

    return Response.json({
      ok: true,
      events: ownedEvents,
    });
  } catch (error) {
    console.error("[WATCHER_EVENTS] erro ao listar eventos", error);

    return Response.json(
      { ok: false, error: "Erro interno ao listar eventos." },
      { status: 500 },
    );
  }
}

type CreateBody = {
  name?: string;
};

export async function POST(request: Request) {
  try {
    const userOrRes = await getWatcherBearerUser(request);

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const body = (await request.json()) as CreateBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return Response.json(
        { success: false, error: "Informe um nome para o evento." },
        { status: 400 },
      );
    }

    const { event } = await createEventRecordWithPersistence(name, {
      ownerUserId: userOrRes.id,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/evento/${event.slug}`);

    return Response.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        uploadToken: event.uploadToken,
      },
    });
  } catch (error) {
    console.error("[WATCHER_EVENTS] erro ao criar evento", error);

    return Response.json(
      { success: false, error: "Erro interno ao criar evento." },
      { status: 500 },
    );
  }
}
