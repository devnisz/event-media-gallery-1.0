import type { GalleryMediaRecord, MediaKind } from "@/types/media";

export type EngagementMetricValue = {
  value: number;
  /** Quando false, a métrica ainda não é coletada pelo sistema. */
  tracked: boolean;
};

export type TopMediaSortKey = "likes" | "shares" | "downloads" | "views";

export type TopMediaItem = {
  id: string;
  name: string;
  thumbnailUrl?: string;
  mediaType: MediaKind;
  likes: number;
  views: number;
  downloads: number;
  shares: number;
  likesTracked: boolean;
  viewsTracked: boolean;
  downloadsTracked: boolean;
  sharesTracked: boolean;
};

export type CabineBreakdownItem = {
  key: "photos" | "boomerangs" | "videos";
  label: string;
  count: number;
  percentage: number;
};

export type UploadActivityPoint = {
  label: string;
  uploads: number;
  timestamp: number;
};

export type EventEngagementMetrics = {
  summary: {
    views: EngagementMetricValue;
    publishedMedia: EngagementMetricValue;
    downloads: EngagementMetricValue;
    shares: EngagementMetricValue;
    likes: EngagementMetricValue;
  };
  reach: {
    likes: EngagementMetricValue;
    downloads: EngagementMetricValue;
    shares: EngagementMetricValue;
    views: EngagementMetricValue;
    /** Soma apenas de métricas com coleta ativa. */
    trackedTotal: number;
  };
  topMedia: TopMediaItem[];
  cabineBreakdown: CabineBreakdownItem[];
  uploadActivity: UploadActivityPoint[];
  engagementAverages: {
    likesPerMedia: number;
    viewsPerMedia: number;
    downloadsPerMedia: number;
    sharesPerMedia: number;
    publishedMediaCount: number;
  };
};

export type BuildEventEngagementMetricsInput = {
  media: GalleryMediaRecord[];
  eventViewCount?: number;
  eventDownloadCount?: number;
  eventShareCount?: number;
};

function mediaTimestamp(media: GalleryMediaRecord): number | null {
  const raw = media.uploadedAt ?? media.createdAt ?? media.timestamp;

  if (!raw?.trim()) {
    return null;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPublishedMedia(media: GalleryMediaRecord): boolean {
  return (
    media.reviewStatus === "approved" &&
    !media.deletedAt &&
    media.isHidden !== true
  );
}

function cabineCategory(mediaType: MediaKind): CabineBreakdownItem["key"] {
  if (mediaType === "boomerang") {
    return "boomerangs";
  }

  if (mediaType === "video") {
    return "videos";
  }

  return "photos";
}

function toTopMediaItem(media: GalleryMediaRecord): TopMediaItem {
  return {
    id: media.id,
    name: media.name,
    thumbnailUrl: media.thumbnailUrl ?? (media.mediaType !== "video" ? media.url : undefined),
    mediaType: media.mediaType,
    likes: Math.max(0, media.likesCount ?? 0),
    views: Math.max(0, media.viewCount ?? 0),
    downloads: Math.max(0, media.downloadCount ?? 0),
    shares: Math.max(0, media.shareCount ?? 0),
    likesTracked: true,
    viewsTracked: true,
    downloadsTracked: true,
    sharesTracked: true,
  };
}

function sortTopMedia(items: TopMediaItem[], sortBy: TopMediaSortKey): TopMediaItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sortBy === "likes") {
      return b.likes - a.likes;
    }

    if (sortBy === "shares") {
      return b.shares - a.shares;
    }

    if (sortBy === "views") {
      return b.views - a.views;
    }

    return b.downloads - a.downloads;
  });

  return sorted.slice(0, 10);
}

function buildUploadActivity(published: GalleryMediaRecord[]): UploadActivityPoint[] {
  const buckets = new Map<number, { label: string; uploads: number }>();

  for (const media of published) {
    const timestamp = mediaTimestamp(media);

    if (timestamp === null) {
      continue;
    }

    const date = new Date(timestamp);
    const bucketStart = new Date(date);
    bucketStart.setMinutes(0, 0, 0);

    const key = bucketStart.getTime();
    const label = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(bucketStart);

    const current = buckets.get(key);

    if (current) {
      current.uploads += 1;
    } else {
      buckets.set(key, { label, uploads: 1 });
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, point]) => ({
      label: point.label,
      uploads: point.uploads,
      timestamp,
    }));
}

function buildCabineBreakdown(published: GalleryMediaRecord[]): CabineBreakdownItem[] {
  const counts: Record<CabineBreakdownItem["key"], number> = {
    photos: 0,
    boomerangs: 0,
    videos: 0,
  };

  for (const media of published) {
    counts[cabineCategory(media.mediaType)] += 1;
  }

  const total = published.length;
  const labels: Record<CabineBreakdownItem["key"], string> = {
    photos: "Fotos",
    boomerangs: "Boomerangs",
    videos: "Vídeos",
  };

  return (["photos", "boomerangs", "videos"] as const).map((key) => ({
    key,
    label: labels[key],
    count: counts[key],
    percentage: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
  }));
}

function sumMediaViews(published: GalleryMediaRecord[]): number {
  return published.reduce((sum, item) => sum + Math.max(0, item.viewCount ?? 0), 0);
}

export function buildEventEngagementMetrics(
  input: BuildEventEngagementMetricsInput | GalleryMediaRecord[],
): EventEngagementMetrics {
  const media = Array.isArray(input) ? input : input.media;
  const eventViewCount = Array.isArray(input)
    ? 0
    : Math.max(0, input.eventViewCount ?? 0);
  const eventDownloadCount = Array.isArray(input)
    ? 0
    : Math.max(0, input.eventDownloadCount ?? 0);
  const eventShareCount = Array.isArray(input)
    ? 0
    : Math.max(0, input.eventShareCount ?? 0);

  const published = media.filter(isPublishedMedia);
  const totalLikes = published.reduce(
    (sum, item) => sum + Math.max(0, item.likesCount ?? 0),
    0,
  );
  const totalMediaViews = sumMediaViews(published);
  const publishedCount = published.length;

  const topMedia = sortTopMedia(published.map(toTopMediaItem), "likes");

  const likesMetric: EngagementMetricValue = {
    value: totalLikes,
    tracked: true,
  };

  const viewsMetric: EngagementMetricValue = {
    value: eventViewCount,
    tracked: true,
  };

  const downloadsMetric: EngagementMetricValue = {
    value: eventDownloadCount,
    tracked: true,
  };

  const sharesMetric: EngagementMetricValue = {
    value: eventShareCount,
    tracked: true,
  };

  const publishedMetric: EngagementMetricValue = {
    value: publishedCount,
    tracked: true,
  };

  const trackedTotal =
    eventViewCount + eventDownloadCount + eventShareCount + totalLikes;

  return {
    summary: {
      views: viewsMetric,
      publishedMedia: publishedMetric,
      downloads: downloadsMetric,
      shares: sharesMetric,
      likes: likesMetric,
    },
    reach: {
      views: viewsMetric,
      downloads: downloadsMetric,
      shares: sharesMetric,
      likes: likesMetric,
      trackedTotal,
    },
    topMedia,
    cabineBreakdown: buildCabineBreakdown(published),
    uploadActivity: buildUploadActivity(published),
    engagementAverages: {
      likesPerMedia:
        publishedCount > 0
          ? Math.round((totalLikes / publishedCount) * 10) / 10
          : 0,
      viewsPerMedia:
        publishedCount > 0
          ? Math.round((totalMediaViews / publishedCount) * 10) / 10
          : 0,
      downloadsPerMedia:
        publishedCount > 0
          ? Math.round((eventDownloadCount / publishedCount) * 10) / 10
          : 0,
      sharesPerMedia:
        publishedCount > 0
          ? Math.round((eventShareCount / publishedCount) * 10) / 10
          : 0,
      publishedMediaCount: publishedCount,
    },
  };
}

export function formatMetricNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatMetricAverage(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}
