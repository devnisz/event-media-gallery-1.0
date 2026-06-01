/**
 * Instrumentação temporária — diagnóstico de abertura de mídia.
 * Remover após identificar o gargalo.
 */

const STORAGE_KEY = "gallery:media-open-perf";
const LOG_PREFIX = "[MEDIA OPEN]";
const SERVER_LOG_PREFIX = "[MEDIA OPEN SERVER]";

type PhaseRecord = {
  phase: string;
  wallMs: number;
  perfMs: number;
  meta?: Record<string, unknown>;
};

export type MediaOpenTrace = {
  mediaId: string;
  clickWallMs: number;
  clickPerfMs: number;
  phases: PhaseRecord[];
  summaryLogged?: boolean;
};

type OpenMilestones = {
  carouselReady: boolean;
  currentMediaReady: boolean;
};

let openMilestones: OpenMilestones = {
  carouselReady: false,
  currentMediaReady: false,
};

function resetOpenMilestones(): void {
  openMilestones = {
    carouselReady: false,
    currentMediaReady: false,
  };
}

function tryFinalizeOpenTrace(reason: string): void {
  if (!openMilestones.carouselReady || !openMilestones.currentMediaReady) {
    return;
  }

  logMediaOpenSummary(reason);
}

function readTrace(): MediaOpenTrace | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as MediaOpenTrace;
  } catch {
    return null;
  }
}

function writeTrace(trace: MediaOpenTrace): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trace));
  } catch {
    /* ignore quota */
  }
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function phaseLabel(from: string | undefined, to: string): string {
  if (!from) {
    return `Click → ${to}`;
  }

  return `${from} → ${to}`;
}

/** Registra o clique na galeria (início do trace). */
export function startMediaOpenTrace(mediaId: string): void {
  if (typeof window === "undefined" || !mediaId.trim()) {
    return;
  }

  const trace: MediaOpenTrace = {
    mediaId: mediaId.trim(),
    clickWallMs: Date.now(),
    clickPerfMs: performance.now(),
    phases: [
      {
        phase: "click",
        wallMs: Date.now(),
        perfMs: performance.now(),
        meta: { mediaId: mediaId.trim() },
      },
    ],
  };

  writeTrace(trace);
  resetOpenMilestones();
  console.info(`${LOG_PREFIX} Clique registrado (media=${mediaId.trim()})`);
}

/** Marca uma fase e emite log com delta desde a fase anterior e total desde o clique. */
export function markMediaOpenPhase(
  phase: string,
  meta?: Record<string, unknown>,
): void {
  const trace = readTrace();

  if (!trace) {
    return;
  }

  const nowWall = Date.now();
  const nowPerf = performance.now();
  const previous = trace.phases[trace.phases.length - 1];

  trace.phases.push({
    phase,
    wallMs: nowWall,
    perfMs: nowPerf,
    meta,
  });

  writeTrace(trace);

  const deltaSincePrevious = previous ? nowWall - previous.wallMs : 0;
  const totalSinceClick = nowWall - trace.clickWallMs;

  console.info(
    `${LOG_PREFIX}\n${phaseLabel(previous?.phase, phase)}: ${formatMs(deltaSincePrevious)} (total ${formatMs(totalSinceClick)})`,
    meta ?? "",
  );
}

/** Loga intervalo entre duas fases já registradas (útil para preload assíncrono). */
export function logMediaOpenInterval(
  fromPhase: string,
  toPhase: string,
  meta?: Record<string, unknown>,
): void {
  const trace = readTrace();

  if (!trace) {
    return;
  }

  const from = trace.phases.find((entry) => entry.phase === fromPhase);
  const to = trace.phases.find((entry) => entry.phase === toPhase);

  if (!from || !to) {
    return;
  }

  const delta = to.wallMs - from.wallMs;
  const totalSinceClick = to.wallMs - trace.clickWallMs;

  console.info(
    `${LOG_PREFIX}\n${phaseLabel(fromPhase, toPhase)}: ${formatMs(delta)} (total ${formatMs(totalSinceClick)})`,
    meta ?? "",
  );
}

/** Resumo final com todas as fases — evita duplicar. */
export function logMediaOpenSummary(reason: string): void {
  const trace = readTrace();

  if (!trace || trace.summaryLogged) {
    return;
  }

  trace.summaryLogged = true;
  writeTrace(trace);

  const lines = trace.phases.map((entry, index) => {
    const previous = index > 0 ? trace.phases[index - 1] : null;
    const delta = previous ? entry.wallMs - previous.wallMs : 0;
    const total = entry.wallMs - trace.clickWallMs;

    return `  ${index + 1}. ${entry.phase}: +${formatMs(delta)} (total ${formatMs(total)})`;
  });

  const totalMs = trace.phases.length
    ? trace.phases[trace.phases.length - 1].wallMs - trace.clickWallMs
    : 0;

  console.info(
    `${LOG_PREFIX} — RESUMO (${reason})\n` +
      `  media=${trace.mediaId}\n` +
      `${lines.join("\n")}\n` +
      `  TOTAL: ${formatMs(totalMs)}`,
  );
}

export type PreloadPerfRole = "prev" | "current" | "next";

/** Marca carrossel pronto e tenta emitir resumo final. */
export function notifyMediaOpenCarouselReady(
  meta?: Record<string, unknown>,
): void {
  if (openMilestones.carouselReady) {
    return;
  }

  openMilestones.carouselReady = true;
  markMediaOpenPhase("carousel-ready", meta);
  tryFinalizeOpenTrace("carousel-ready");
}

/** Marca mídia atual decodificada e tenta emitir resumo final. */
export function notifyMediaOpenCurrentMediaReady(
  meta?: Record<string, unknown>,
): void {
  if (openMilestones.currentMediaReady) {
    return;
  }

  openMilestones.currentMediaReady = true;
  markMediaOpenPhase("current-media-ready", meta);
  tryFinalizeOpenTrace("current-media-ready");
}

/** Marca início/fim de preload com logs dedicados. */
export function markMediaOpenPreload(
  role: PreloadPerfRole,
  stage: "start" | "done" | "skipped",
  meta?: Record<string, unknown>,
): void {
  const phase = `preload-${role}-${stage}`;
  markMediaOpenPhase(phase, {
    role,
    stage,
    ...meta,
  });

  if (stage === "done") {
    logMediaOpenInterval(`preload-${role}-start`, phase, meta);
  }
}

/** Logs de timing no servidor (terminal Next.js). */
export function logMediaOpenServerPhase(
  phase: string,
  durationMs: number,
  meta?: Record<string, unknown>,
): void {
  console.info(
    `${SERVER_LOG_PREFIX} ${phase}: ${formatMs(durationMs)}`,
    meta ?? "",
  );
}
