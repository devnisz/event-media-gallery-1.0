import { randomBytes } from "crypto";

const PREFIX = "up_";

/** Token opaco para binding watcher ↔ evento (não usar como único segredo de API). */
export function generateUploadToken(): string {
  const bytes = randomBytes(18);
  const suffix = bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${PREFIX}${suffix}`;
}

export function generateUniqueUploadToken(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidate = generateUploadToken();

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Nao foi possivel gerar uploadToken unico.");
}
