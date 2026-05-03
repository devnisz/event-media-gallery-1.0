const ACCENT_REGEX =
  /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(ACCENT_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return base || "evento";
}

export function generateEventId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";

  for (let i = 0; i < 7; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `evt_${suffix}`;
}

export function ensureUniqueSlug(baseSlug: string, taken: Set<string>): string {
  let candidate = baseSlug;
  let n = 2;

  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }

  return candidate;
}
