import { validateWatcherCredentials } from "@/services/tokenService";

type Body = {
  eventId?: string;
  uploadToken?: string;
};

/** Validação estilo API para watcher/Electron futuros (sem auth nesta etapa). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const uploadToken =
      typeof body.uploadToken === "string" ? body.uploadToken : "";

    const result = await validateWatcherCredentials(eventId, uploadToken);

    if (!result.ok) {
      const status = result.code === "EVENT_NOT_FOUND" ? 404 : 401;

      return Response.json(
        {
          ok: false as const,
          code: result.code,
          message:
            result.code === "EVENT_NOT_FOUND"
              ? "Evento nao encontrado."
              : result.code === "TOKEN_MISSING"
                ? "uploadToken obrigatorio."
                : result.code === "TOKEN_MISMATCH"
                  ? "Credenciais invalidas."
                  : "Token nao configurado para este evento.",
        },
        { status },
      );
    }

    return Response.json({
      ok: true as const,
      event: result.event,
    });
  } catch (error) {
    console.error("Erro ao validar watcher:", error);

    return Response.json(
      { ok: false as const, code: "INTERNAL", message: "Erro interno." },
      { status: 500 },
    );
  }
}
