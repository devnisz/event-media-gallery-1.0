import { permanentRedirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";

type LegacyVideoPageRedirectProps = {
  params: Promise<{
    id: string;
  }>;
};

/** Legado `/video/[id]` → redirect 308 permanente para `/media/[id]`. */
export default async function LegacyVideoPageRedirect({
  params,
}: LegacyVideoPageRedirectProps) {
  const { id } = await params;

  permanentRedirect(routes.media(safeDecodeURIComponentSegment(id)));
}
