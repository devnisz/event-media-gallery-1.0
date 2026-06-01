import { logMediaOpenServerPhase } from "@/lib/gallery/media-open-perf";

/** Mede uma etapa assíncrona no servidor (terminal Next.js). */
export async function measureMediaOpenServer<T>(
  phase: string,
  task: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  const result = await task();
  logMediaOpenServerPhase(phase, Date.now() - start, meta);
  return result;
}

/** Mede duração total de múltiplas etapas no servidor. */
export function createMediaOpenServerTimer() {
  const pageStart = Date.now();

  return {
    finish(meta?: Record<string, unknown>) {
      logMediaOpenServerPhase("page-total", Date.now() - pageStart, meta);
    },
  };
}
