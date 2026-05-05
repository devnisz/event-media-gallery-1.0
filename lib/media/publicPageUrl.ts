/**
 * URL absoluta da página pública (QR, links). Seguro para cliente e servidor.
 */
export function buildPublicPageUrl(pathname: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (base) {
    const normalizedBase = base.startsWith("http")
      ? base
      : `https://${base}`;

    const root = normalizedBase.endsWith("/")
      ? normalizedBase
      : `${normalizedBase}/`;

    return new URL(pathname.replace(/^\//, ""), root).toString();
  }

  return pathname;
}
