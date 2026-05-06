/**
 * URL absoluta da página pública (QR, links). Seguro para cliente e servidor.
 * `new URL` pode lançar se `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL` estiver incorreto.
 */
export function buildPublicPageUrl(pathname: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (base) {
    try {
      const normalizedBase = base.startsWith("http")
        ? base
        : `https://${base}`;

      const root = normalizedBase.endsWith("/")
        ? normalizedBase
        : `${normalizedBase}/`;

      const relative = pathname.replace(/^\//, "");

      return new URL(relative, root).toString();
    } catch {
      /* base inválido — não derrubar SSR; path relativo continua válido no browser */
    }
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
