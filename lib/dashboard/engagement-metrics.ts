import type { GalleryMediaRecord, MediaKind } from "@/types/media";

export type EngagementMetricValue = {
  value: number;
  /** Quando false, a métrica ainda não é coletada pelo sistema. */
  tracked: boolean;
};

export type TopMediaSortKey = "likes" | "shares" | "downloads";

export type TopMediaItem = {
  id: string;
  name: string;
  thumbnailUrl?: string;
  mediaType: MediaKind;
  likes: number;
  downloads: number;
  shares: number;
  likesTracked: boolean;
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
    downloadsPerMedia: number;
    sharesPerMedia: number;
    publishedMediaCount: number;
  };
};

const UNTRACKED: EngagementMetricValue = { value: 0, tracked: false };

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
    downloads: 0,
    shares: 0,
    likesTracked: true,
    downloadsTracked: false,
    sharesTracked: false,
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

export function buildEventEngagementMetrics(
  media: GalleryMediaRecord[],
): EventEngagementMetrics {
  const published = media.filter(isPublishedMedia);
  const totalLikes = published.reduce(
    (sum, item) => sum + Math.max(0, item.likesCount ?? 0),
    0,
  );
  const publishedCount = published.length;

  const topMedia = sortTopMedia(published.map(toTopMediaItem), "likes");

  const likesMetric: EngagementMetricValue = {
    value: totalLikes,
    tracked: true,
  };

  const publishedMetric: EngagementMetricValue = {
    value: publishedCount,
    tracked: true,
  };

  return {
    summary: {
      views: UNTRACKED,
      publishedMedia: publishedMetric,
      downloads: UNTRACKED,
      shares: UNTRACKED,
      likes: likesMetric,
    },
    reach: {
      views: UNTRACKED,
      downloads: UNTRACKED,
      shares: UNTRACKED,
      likes: likesMetric,
      trackedTotal: totalLikes,
    },
    topMedia,
    cabineBreakdown: buildCabineBreakdown(published),
    uploadActivity: buildUploadActivity(published),
    engagementAverages: {
      likesPerMedia:
        publishedCount > 0
          ? Math.round((totalLikes / publishedCount) * 10) / 10
          : 0,
      downloadsPerMedia: 0,
      sharesPerMedia: 0,
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
