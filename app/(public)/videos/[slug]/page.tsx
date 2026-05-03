import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

type LegacyVideoRedirectProps = {
  params: Promise<{
    slug: string;
  }>;
};

/** Mantém bookmarks antigos `/videos/[slug]` → `/video/[id]`. */
export default async function LegacyVideoRedirect({
  params,
}: LegacyVideoRedirectProps) {
  const { slug } = await params;

  redirect(routes.video(slug));
}
