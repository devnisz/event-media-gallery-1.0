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
  console.info("[WATCHER_CREATE_EVENT][START]", {
    at: new Date().toISOString(),
  });

  try {
    const userOrRes = await getWatcherBearerUser(request);

    if (userOrRes instanceof Response) {
      console.error("[WATCHER_CREATE_EVENT][ERROR]", {
        phase: "auth",
        status: userOrRes.status,
      });
      return userOrRes;
    }

    const body = (await request.json()) as CreateBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const persistenceInput = { ownerUserId: userOrRes.id };

    console.info("[WATCHER_CREATE_EVENT][BODY]", {
      body,
      name,
      nameLength: name.length,
    });

    console.info("[WATCHER_CREATE_EVENT][USER]", {
      ownerUserId: userOrRes.id,
      ownerUserIdTail: userOrRes.id.slice(-8),
      email: userOrRes.email ?? null,
    });

    if (!name) {
      return Response.json(
        { success: false, error: "Informe um nome para o evento." },
        { status: 400 },
      );
    }

    console.info("[WATCHER_CREATE_EVENT][BEFORE_CREATE]", {
      name,
      ownerUserId: userOrRes.id,
      options: persistenceInput,
    });

    const persistenceResult = await createEventRecordWithPersistence(
      name,
      persistenceInput,
    );

    console.info("[WATCHER_CREATE_EVENT][AFTER_CREATE]", {
      event: persistenceResult.event,
      persistence: persistenceResult.persistence,
    });

    const { event } = persistenceResult;
    const revalidateTargets = [
      "/",
      "/dashboard",
      `/evento/${event.slug}`,
    ] as const;

    console.info("[WATCHER_CREATE_EVENT][BEFORE_REVALIDATE]", {
      paths: [...revalidateTargets],
      eventId: event.id,
      slug: event.slug,
    });

    for (const path of revalidateTargets) {
      revalidatePath(path);
      console.info("[WATCHER_CREATE_EVENT][AFTER_REVALIDATE]", {
        path,
        ok: true,
      });
    }

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
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[WATCHER_CREATE_EVENT][ERROR]", {
      message,
      stack: stack ?? null,
      error,
      serialized:
        error && typeof error === "object"
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : String(error),
    });

    console.error("[WATCHER_EVENTS] erro ao criar evento", {
      message,
      stack,
      error,
    });

    return Response.json(
      {
        success: false,
        error: "Erro interno ao criar evento.",
        errorDetail: message,
        errorStack: stack ?? null,
      },
      { status: 500 },
    );
  }
}
