import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";

/** Tipos de captura da Cabine Virtual (extensível: gif, story, stickers…). */
export type CabineVirtualCaptureKind =
  | "photo"
  | "gif"
  | "boomerang"
  | "video";

export const CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS = 5;
export const CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS = 30;
export const CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS = 10;

export type CabineVirtualEventConfig = {
  enabled: boolean;
  photo: boolean;
  boomerang: boolean;
  video: boolean;
  /** GIF legado — permanece disponível até haver toggle no dashboard. */
  gif: boolean;
  videoMaxDurationSeconds: number;
};

export type CabineVirtualSettingsInput = {
  cabineVirtualEnabled: boolean;
  cabineVirtualPhotoEnabled: boolean;
  cabineVirtualBoomerangEnabled: boolean;
  cabineVirtualVideoEnabled: boolean;
  cabineVirtualVideoMaxDurationSeconds: number;
};

type CabineVirtualSource = Pick<
  GalleryEventRecord,
  | "cabineVirtualEnabled"
  | "cabineVirtualPhotoEnabled"
  | "cabineVirtualBoomerangEnabled"
  | "cabineVirtualVideoEnabled"
  | "cabineVirtualVideoMaxDurationSeconds"
>;

function hasCabineVirtualFields(
  source: CabineVirtualSource | StoredEventLoose,
): boolean {
  return (
    typeof source.cabineVirtualEnabled === "boolean" ||
    typeof source.cabineVirtualPhotoEnabled === "boolean" ||
    typeof source.cabineVirtualBoomerangEnabled === "boolean" ||
    typeof source.cabineVirtualVideoEnabled === "boolean" ||
    typeof source.cabineVirtualVideoMaxDurationSeconds === "number"
  );
}

/** Eventos legados sem campos persistidos mantêm a Cabine ativa como antes. */
export function resolveCabineVirtualConfig(
  source: CabineVirtualSource | StoredEventLoose,
): CabineVirtualEventConfig {
  const legacy = !hasCabineVirtualFields(source);

  if (legacy) {
    return {
      enabled: true,
      photo: true,
      boomerang: true,
      video: false,
      gif: true,
      videoMaxDurationSeconds: CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS,
    };
  }

  const enabled = source.cabineVirtualEnabled === true;
  const photo = source.cabineVirtualPhotoEnabled === true;
  const boomerang = source.cabineVirtualBoomerangEnabled === true;
  const video = source.cabineVirtualVideoEnabled === true;

  return {
    enabled,
    photo,
    boomerang,
    video,
    gif: true,
    videoMaxDurationSeconds: clampVideoMaxDurationSeconds(
      source.cabineVirtualVideoMaxDurationSeconds,
    ),
  };
}

export function clampVideoMaxDurationSeconds(value: unknown): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS;

  return Math.min(
    CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS,
    Math.max(CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS, numeric),
  );
}

export function isCabineVirtualCaptureEnabled(
  config: CabineVirtualEventConfig,
  kind: CabineVirtualCaptureKind,
): boolean {
  switch (kind) {
    case "photo":
      return config.photo;
    case "gif":
      return config.gif;
    case "boomerang":
      return config.boomerang;
    case "video":
      return config.video;
    default:
      return false;
  }
}

export function hasAnyCabineVirtualCapture(
  config: CabineVirtualEventConfig,
): boolean {
  return (
    config.photo ||
    config.boomerang ||
    config.video ||
    config.gif
  );
}

export function shouldShowCabineVirtualLauncher(
  config: CabineVirtualEventConfig,
): boolean {
  return config.enabled && hasAnyCabineVirtualCapture(config);
}

export function validateCabineVirtualSettingsInput(
  input: CabineVirtualSettingsInput,
): string | null {
  if (!input.cabineVirtualEnabled) {
    return null;
  }

  const hasCapture =
    input.cabineVirtualPhotoEnabled ||
    input.cabineVirtualBoomerangEnabled ||
    input.cabineVirtualVideoEnabled;

  if (!hasCapture) {
    return "Ative pelo menos um tipo de captura (Foto, Boomerang ou Vídeo) ou desligue a Cabine Virtual.";
  }

  return null;
}

export function cabineVirtualFieldsFromInput(
  input: CabineVirtualSettingsInput,
): Pick<
  GalleryEventRecord,
  | "cabineVirtualEnabled"
  | "cabineVirtualPhotoEnabled"
  | "cabineVirtualBoomerangEnabled"
  | "cabineVirtualVideoEnabled"
  | "cabineVirtualVideoMaxDurationSeconds"
> {
  const enabled = input.cabineVirtualEnabled === true;

  return {
    cabineVirtualEnabled: enabled,
    cabineVirtualPhotoEnabled: enabled && input.cabineVirtualPhotoEnabled === true,
    cabineVirtualBoomerangEnabled:
      enabled && input.cabineVirtualBoomerangEnabled === true,
    cabineVirtualVideoEnabled: enabled && input.cabineVirtualVideoEnabled === true,
    cabineVirtualVideoMaxDurationSeconds: clampVideoMaxDurationSeconds(
      input.cabineVirtualVideoMaxDurationSeconds,
    ),
  };
}
