/** Rotas nomeadas — evita strings espalhadas e facilita Electron/deep links. */
export const routes = {
  home: "/",
  admin: "/admin",
  event: (slug: string) => `/evento/${encodeURIComponent(slug)}`,
  video: (id: string) => `/video/${encodeURIComponent(id)}`,
  legacyVideo: (slug: string) => `/videos/${encodeURIComponent(slug)}`,
} as const;
