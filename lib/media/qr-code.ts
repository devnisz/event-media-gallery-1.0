import { buildPublicPageUrl } from "@/lib/media/publicPageUrl";
import { routes } from "@/lib/routes";
import { storePublicAssetObject } from "@/lib/r2/upload";

export async function generateAndStoreMediaQrCode(
  mediaId: string,
): Promise<string> {
  const pageUrl = buildPublicPageUrl(routes.media(mediaId));
  const qrUrl = new URL("https://quickchart.io/qr");

  qrUrl.searchParams.set("text", pageUrl);
  qrUrl.searchParams.set("size", "512");
  qrUrl.searchParams.set("margin", "2");
  qrUrl.searchParams.set("format", "png");

  const response = await fetch(qrUrl);

  if (!response.ok) {
    throw new Error(`Falha ao gerar QR Code (${response.status}).`);
  }

  return storePublicAssetObject({
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: "image/png",
    key: `qrcodes/${mediaId}.png`,
  });
}
