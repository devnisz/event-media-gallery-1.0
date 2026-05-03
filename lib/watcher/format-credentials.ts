import type { GalleryEventRecord } from "@/types/event";

export function formatWatcherCredentialsSnippet(
  event: GalleryEventRecord,
): string {
  return [`EVENT_ID=${event.id}`, `UPLOAD_TOKEN=${event.uploadToken}`].join(
    "\n",
  );
}
