/** Rotas nomeadas — evita strings espalhadas e facilita Electron/deep links. */
export const routes = {
  home: "/",
  /** Painel autenticado (antes `/admin`). */
  dashboard: "/dashboard",
  login: "/login",
  event: (slug: string) => `/evento/${encodeURIComponent(slug)}`,
  video: (id: string) => `/video/${encodeURIComponent(id)}`,
  legacyVideo: (slug: string) => `/videos/${encodeURIComponent(slug)}`,
  /** Proxy same-origin para contornar CORS do browser ao gravar ficheiro. */
  mediaDownload: (id: string) =>
    `/api/media/${encodeURIComponent(id)}/download`,
} as const;
