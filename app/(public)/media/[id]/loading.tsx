import { AmbientBackground } from "@/components/public/ambient-background";
import { MediaWaitingPageClient } from "@/components/public/media-waiting-page-client";

/** Shell inicial enquanto a página canônica carrega — evita flash de 404. */
export default function MediaPageLoading() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3">
      <AmbientBackground />
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <MediaWaitingPageClient
          mediaId=""
          initialStatus={{ exists: false, ready: false }}
          pollEnabled={false}
        />
      </div>
    </main>
  );
}
