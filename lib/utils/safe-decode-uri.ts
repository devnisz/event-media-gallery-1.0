/**
 * `decodeURIComponent` lança URIError com segmentos malformados (ex.: `%` solto).
 * Requisições assim geram 500 no SSR se o param não for tratado.
 */
export function safeDecodeURIComponentSegment(value: string): string {
  if (!value) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
