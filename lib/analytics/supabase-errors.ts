export function isEngagementSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    /view_count|download_count|share_count|event_gallery_view_sessions|media_view_sessions/i.test(
      message,
    ) ||
    /PGRST204|does not exist|Could not find the/i.test(message)
  );
}
