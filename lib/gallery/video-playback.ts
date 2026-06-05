/** Resultado da tentativa de autoplay respeitando políticas do navegador. */
export type VideoPlaybackMode = "audible" | "muted";

/**
 * Tenta reproduzir com som. Se o navegador bloquear autoplay com áudio,
 * faz fallback para mudo (o usuário pode ativar som pelos controles nativos).
 */
export async function playVideoWithSoundPreference(
  video: HTMLVideoElement,
): Promise<VideoPlaybackMode> {
  video.muted = false;

  try {
    await video.play();
    return "audible";
  } catch {
    video.muted = true;

    await video.play();
    return "muted";
  }
}

/** Ativa o som após interação do usuário (toque no botão ou controles nativos). */
export function unmuteVideoElement(video: HTMLVideoElement): void {
  video.muted = false;
  void video.play().catch(() => {
    // Controles nativos permanecem disponíveis.
  });
}
