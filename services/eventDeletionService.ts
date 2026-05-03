/**
 * Ordem das operações (consistência vs limpeza):
 * 1) Persistência JSON primeiro — fonte da verdade para a UI pública não referencia mais o evento nem seus vídeos.
 * 2) R2 por vídeo — melhor esforço; erros não impedem os próximos prefixos.
 * 3) Arquivos locais em `public/` — melhor esforço após JSON para não servir URLs órfãs.
 *
 * Futuro Supabase: substituir writes JSON por chamadas ao adapter mantendo esta orquestração.
 */
import type { EventDeletionReport } from "@/types/deletion";
import { readEvents, writeEvents } from "@/services/eventService";
import {
  loadGalleryVideosForMutation,
  reconcileAllEventCounts,
  replaceGalleryMediaRecordsOnDisk,
  sortGalleryMediaRecords,
  unlinkGalleryPublicAsset,
} from "@/services/mediaService";
import {
  deleteAllObjectsWithPrefix,
  tryCreateR2DeletionClient,
} from "@/lib/r2/removal";

export class EventNotFoundDeletionError extends Error {
  constructor() {
    super("Evento não encontrado.");
    this.name = "EventNotFoundDeletionError";
  }
}

export async function deleteEventAndRelatedAssets(
  eventId: string,
): Promise<EventDeletionReport> {
  const started = Date.now();
  const logs: string[] = [];
  const r2Errors: string[] = [];

  const push = (msg: string) => {
    const line = `[eventDeletion:${eventId}] ${msg}`;
    console.log(line);
    logs.push(line);
  };

  const events = await readEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    throw new EventNotFoundDeletionError();
  }

  const allMedia = await loadGalleryVideosForMutation();
  const victims = allMedia.filter((v) => v.eventId === eventId);
  const remaining = sortGalleryMediaRecords(
    allMedia.filter((v) => v.eventId !== eventId),
  );

  push(
    `Início: ${victims.length} mídia(s) vinculadas ao evento "${event.name}".`,
  );

  await replaceGalleryMediaRecordsOnDisk(remaining);
  await writeEvents(events.filter((e) => e.id !== eventId));
  await reconcileAllEventCounts();

  push("Persistência JSON atualizada (events.json e videos.json).");

  let r2ObjectsRemoved = 0;
  const r2 = tryCreateR2DeletionClient();

  if (!r2) {
    push(
      "R2: credenciais ausentes ou inválidas — exclusão remota ignorada.",
    );
  } else {
    for (const v of victims) {
      const prefix = `${r2.keyPrefix}/${v.id}/`;
      push(`R2: removendo objetos com prefixo "${prefix}"…`);

      try {
        const { deleted, errors } = await deleteAllObjectsWithPrefix(
          r2.client,
          r2.bucket,
          prefix,
        );

        r2ObjectsRemoved += deleted;
        r2Errors.push(...errors);
        push(`R2: ${deleted} objeto(s) removidos para mídia ${v.id}.`);

        for (const err of errors) {
          push(`R2 erro: ${err}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        r2Errors.push(`${prefix}: ${msg}`);
        push(`R2 FALHA no prefixo ${prefix}: ${msg}`);
      }
    }
  }

  let localVideoFilesRemoved = 0;
  let localThumbnailsRemoved = 0;
  let localQrCodesRemoved = 0;

  for (const v of victims) {
    try {
      const r = await unlinkGalleryPublicAsset(v.url);

      if (r === "removed") {
        localVideoFilesRemoved++;
      }

      push(`url ${v.id}: ${r}`);
    } catch (e) {
      push(
        `url ${v.id} FALHA: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    try {
      const r = await unlinkGalleryPublicAsset(v.thumbnailUrl);

      if (r === "removed") {
        localThumbnailsRemoved++;
      }

      push(`thumbnail ${v.id}: ${r}`);
    } catch (e) {
      push(
        `thumbnail ${v.id} FALHA: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    try {
      const r = await unlinkGalleryPublicAsset(v.qrCode);

      if (r === "removed") {
        localQrCodesRemoved++;
      }

      push(`qrCode ${v.id}: ${r}`);
    } catch (e) {
      push(
        `qrCode ${v.id} FALHA: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const durationMs = Date.now() - started;
  push(`Concluído em ${durationMs} ms.`);

  return {
    eventId: event.id,
    eventName: event.name,
    eventSlug: event.slug,
    durationMs,
    videosRemoved: victims.length,
    localVideoFilesRemoved,
    localThumbnailsRemoved,
    localQrCodesRemoved,
    r2ObjectsRemoved,
    r2Errors,
    logs,
  };
}
