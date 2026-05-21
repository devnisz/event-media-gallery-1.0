export function formatBytes(bytes: number | null | undefined): string {
  const value = typeof bytes === "number" && Number.isFinite(bytes) ? bytes : 0;

  if (value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** exponent;

  return `${amount.toLocaleString("pt-BR", {
    maximumFractionDigits: exponent === 0 ? 0 : 1,
  })} ${units[exponent]}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Nunca";
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatStorage(
  bytes: number,
  storageSizeAvailable: boolean,
): string {
  return storageSizeAvailable ? formatBytes(bytes) : "Indisponível";
}
