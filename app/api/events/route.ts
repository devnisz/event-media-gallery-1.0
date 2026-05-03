import { revalidatePath } from "next/cache";
import { createEventRecord } from "@/services/eventService";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return Response.json(
        { error: "Informe um nome para o evento." },
        { status: 400 },
      );
    }

    const event = await createEventRecord(name);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/evento/${event.slug}`);

    return Response.json({ ok: true, event });
  } catch (error) {
    console.error("Erro ao criar evento:", error);

    return Response.json(
      { error: "Nao foi possivel criar o evento." },
      { status: 500 },
    );
  }
}
