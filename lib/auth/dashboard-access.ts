import type { GalleryEventRecord } from "@/types/event";
import type { GalleryMediaRecord } from "@/types/media";

/** Erro de autorização / recurso para APIs (evita importar `NextResponse` aqui). */
export class DashboardAccessError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DashboardAccessError";
    this.status = status;
  }
}

/**
 * Evento sem dono (legado): qualquer usuário autenticado pode mutar na Fase 1.
 * Com `owner_user_id`, apenas o dono.
 */
export function assertUserCanMutateEvent(
  userId: string,
  event: GalleryEventRecord | undefined,
): asserts event is GalleryEventRecord {
  if (!event) {
    throw new DashboardAccessError(404, "Evento não encontrado.");
  }

  if (event.ownerUserId && event.ownerUserId !== userId) {
    throw new DashboardAccessError(
      403,
      "Sem permissão para alterar este evento.",
    );
  }
}

export function assertUserCanMutateMediaForEvent(
  userId: string,
  media: GalleryMediaRecord | undefined,
  event: GalleryEventRecord | undefined,
): asserts media is GalleryMediaRecord {
  if (!media) {
    throw new DashboardAccessError(404, "Mídia não encontrada.");
  }

  assertUserCanMutateEvent(userId, event);
}
