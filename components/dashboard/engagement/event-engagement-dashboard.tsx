"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Camera,
  Download,
  Eye,
  Heart,
  Image as ImageIcon,
  Share2,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatMetricAverage,
  formatMetricNumber,
  type EngagementMetricValue,
  type EventEngagementMetrics,
  type TopMediaSortKey,
} from "@/lib/dashboard/engagement-metrics";
import { cn } from "@/lib/utils";

type EventEngagementDashboardProps = {
  metrics: EventEngagementMetrics;
  variant?: "full" | "overview";
};

type SummaryCardConfig = {
  id: string;
  label: string;
  metric: EngagementMetricValue;
  icon: React.ComponentType<{ className?: string }>;
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "rgba(8, 10, 18, 0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "#f8fafc",
  fontSize: "12px",
};

function MetricComingSoon({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-white/6 bg-white/[0.03]",
          compact ? "h-8" : "h-10",
        )}
      >
        <div
          className="h-full w-2/5 animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5"
          aria-hidden
        />
      </div>
      <p
        className={cn(
          "font-semibold text-white/55",
          compact ? "text-xs" : "text-sm",
        )}
      >
        Em breve
      </p>
      {!compact ? (
        <p className="text-xs text-white/30">
          Coleta será ativada na próxima versão
        </p>
      ) : null}
    </div>
  );
}

function MetricValue({
  metric,
  className,
}: {
  metric: EngagementMetricValue;
  className?: string;
}) {
  if (!metric.tracked) {
    return (
      <div className={className}>
        <MetricComingSoon />
      </div>
    );
  }

  return (
    <p
      className={cn(
        "text-3xl font-black tracking-tight text-white sm:text-4xl",
        className,
      )}
    >
      {formatMetricNumber(metric.value)}
    </p>
  );
}

function SummaryCard({ label, metric, icon: Icon }: SummaryCardConfig) {
  return (
    <Card className="group transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <p className="text-sm text-white/45">{label}</p>
            <MetricValue metric={metric} />
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-white/55 transition-colors group-hover:text-white/75">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReachMetricRow({
  label,
  metric,
  icon: Icon,
  share,
}: {
  label: string;
  metric: EngagementMetricValue;
  icon: React.ComponentType<{ className?: string }>;
  share: number;
}) {
  if (!metric.tracked) {
    return (
      <div className="rounded-xl border border-white/6 bg-black/15 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Icon className="size-3.5" />
          <span className="font-medium text-white/70">{label}</span>
        </div>
        <MetricComingSoon compact />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-white/55">
          <Icon className="size-3.5" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {formatMetricNumber(metric.value)}
          </span>
          <span className="text-xs text-white/35">{share}%</span>
        </div>
      </div>
      <Progress value={share} indicatorClassName="bg-white/75" />
    </div>
  );
}

function TopMediaRow({
  rank,
  item,
}: {
  rank: number;
  item: EventEngagementMetrics["topMedia"][number];
}) {
  const preview = item.thumbnailUrl;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/6 bg-black/15 px-4 py-3 transition-colors hover:border-white/12 hover:bg-black/25">
      <span className="w-6 text-sm font-bold text-white/30">{rank}</span>
      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs externas da galeria
          <img
            src={preview}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/25">
            <ImageIcon className="size-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          {item.mediaType === "video"
            ? "Vídeo"
            : item.mediaType === "image"
              ? "Foto"
              : item.mediaType === "boomerang"
                ? "Boomerang"
                : "GIF"}
        </p>
        <p className="mt-0.5 text-xs text-white/35">#{rank} no ranking</p>
      </div>
      <div className="hidden items-center gap-4 text-xs sm:flex">
        <StatPill icon={Heart} value={item.likes} tracked={item.likesTracked} />
        <StatPill
          icon={Download}
          value={item.downloads}
          tracked={item.downloadsTracked}
        />
        <StatPill
          icon={Share2}
          value={item.shares}
          tracked={item.sharesTracked}
        />
      </div>
      <div className="flex flex-col gap-1 text-xs sm:hidden">
        <StatPill icon={Heart} value={item.likes} tracked={item.likesTracked} />
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  value,
  tracked,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  tracked: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/55">
      <Icon className="size-3.5" />
      <span className="font-semibold text-white/80">
        {tracked ? formatMetricNumber(value) : "—"}
      </span>
    </span>
  );
}

function CabineIcon({ type }: { type: "photos" | "boomerangs" | "videos" }) {
  if (type === "videos") {
    return <Video className="size-4" />;
  }

  if (type === "boomerangs") {
    return <Sparkles className="size-4" />;
  }

  return <Camera className="size-4" />;
}

function sortTopMedia(
  items: EventEngagementMetrics["topMedia"],
  sortBy: TopMediaSortKey,
) {
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

function ActivityChartCard({
  activityData,
}: {
  activityData: EventEngagementMetrics["uploadActivity"];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-white/60" />
          <CardTitle>Atividade do evento</CardTitle>
        </div>
        <CardDescription>
          Uploads ao longo do tempo para identificar horários de pico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activityData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 text-sm text-white/40">
            Sem uploads registrados ainda.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="uploadActivityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: "rgba(255,255,255,0.55)" }}
                  formatter={(value) => [
                    formatMetricNumber(Number(value)),
                    "Uploads",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth={2}
                  fill="url(#uploadActivityFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#f8fafc" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopMediaCard({
  metrics,
  topMediaSort,
  onTopMediaSortChange,
}: {
  metrics: EventEngagementMetrics;
  topMediaSort: TopMediaSortKey;
  onTopMediaSortChange: (value: TopMediaSortKey) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-white/60" />
          <CardTitle>Top mídias</CardTitle>
        </div>
        <CardDescription>
          Ranking dos 10 conteúdos com melhor desempenho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={topMediaSort}
          onValueChange={(value) => onTopMediaSortChange(value as TopMediaSortKey)}
        >
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="likes">Mais curtidas</TabsTrigger>
            <TabsTrigger value="shares">Mais compartilhadas</TabsTrigger>
            <TabsTrigger value="downloads">Mais baixadas</TabsTrigger>
          </TabsList>

          {(["likes", "shares", "downloads"] as const).map((sortKey) => {
            const rankedItems = sortTopMedia(metrics.topMedia, sortKey);

            return (
              <TabsContent key={sortKey} value={sortKey} className="space-y-3">
                {rankedItems.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
                    Nenhuma mídia publicada ainda.
                  </p>
                ) : (
                  rankedItems.map((item, index) => (
                    <TopMediaRow key={item.id} rank={index + 1} item={item} />
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function CabineBreakdownCard({
  breakdown,
}: {
  breakdown: EventEngagementMetrics["cabineBreakdown"];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-white/60" />
          <CardTitle>Formatos publicados</CardTitle>
        </div>
        <CardDescription>
          Distribuição de fotos, boomerangs e vídeos no evento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {breakdown.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <CabineIcon type={item.key} />
                <span>{item.label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {item.percentage}%
                </p>
                <p className="text-xs text-white/35">
                  {formatMetricNumber(item.count)} mídias
                </p>
              </div>
            </div>
            <Progress value={item.percentage} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EventEngagementDashboard({
  metrics,
  variant = "full",
}: EventEngagementDashboardProps) {
  const [topMediaSort, setTopMediaSort] = useState<TopMediaSortKey>("likes");
  const isOverview = variant === "overview";

  const summaryCards: SummaryCardConfig[] = [
    {
      id: "views",
      label: "Visualizações",
      metric: metrics.summary.views,
      icon: Eye,
    },
    {
      id: "likes",
      label: "Curtidas",
      metric: metrics.summary.likes,
      icon: Heart,
    },
    {
      id: "downloads",
      label: "Downloads",
      metric: metrics.summary.downloads,
      icon: Download,
    },
    {
      id: "shares",
      label: "Compartilhamentos",
      metric: metrics.summary.shares,
      icon: Share2,
    },
    {
      id: "published",
      label: "Uploads",
      metric: metrics.summary.publishedMedia,
      icon: ImageIcon,
    },
  ];

  const reachShares = useMemo(() => {
    const entries = [
      metrics.reach.views,
      metrics.reach.downloads,
      metrics.reach.shares,
      metrics.reach.likes,
    ].filter((entry) => entry.tracked);

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);

    if (total <= 0) {
      return {
        views: 0,
        downloads: 0,
        shares: 0,
        likes: 0,
      };
    }

    return {
      views: Math.round((metrics.reach.views.value / total) * 100),
      downloads: Math.round((metrics.reach.downloads.value / total) * 100),
      shares: Math.round((metrics.reach.shares.value / total) * 100),
      likes: Math.round((metrics.reach.likes.value / total) * 100),
    };
  }, [metrics.reach]);

  const activityData = metrics.uploadActivity;

  const averageCards = [
    {
      label: "Curtidas por mídia",
      value: metrics.engagementAverages.likesPerMedia,
      tracked: true,
      icon: Heart,
    },
    {
      label: "Downloads por mídia",
      value: metrics.engagementAverages.downloadsPerMedia,
      tracked: false,
      icon: Download,
    },
    {
      label: "Compartilhamentos por mídia",
      value: metrics.engagementAverages.sharesPerMedia,
      tracked: false,
      icon: Share2,
    },
  ];

  return (
    <section className="space-y-8">
      {!isOverview ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
            Engajamento
          </p>
          <h2 className="text-xl font-black tracking-tight text-white">
            Dashboard de engajamento
          </h2>
          <p className="max-w-2xl text-sm text-white/45">
            Impacto do evento. Métricas com coleta ativa usam dados reais.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </div>

      {isOverview ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <ActivityChartCard activityData={activityData} />
          <TopMediaCard
            metrics={metrics}
            topMediaSort={topMediaSort}
            onTopMediaSortChange={setTopMediaSort}
          />
        </div>
      ) : null}

      {!isOverview ? (
        <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-amber-100" />
              <CardTitle>Alcance do evento</CardTitle>
            </div>
            <CardDescription>
              Impacto combinado de visualizações, downloads, compartilhamentos e
              curtidas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-5">
              <p className="text-sm text-white/45">Engajamento rastreado</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-white">
                {formatMetricNumber(metrics.reach.trackedTotal)}
              </p>
              <p className="mt-2 text-xs text-white/35">
                Soma das métricas com coleta ativa no momento.
              </p>
            </div>

            <div className="space-y-4">
              <ReachMetricRow
                label="Visualizações"
                metric={metrics.reach.views}
                icon={Eye}
                share={reachShares.views}
              />
              <ReachMetricRow
                label="Downloads"
                metric={metrics.reach.downloads}
                icon={Download}
                share={reachShares.downloads}
              />
              <ReachMetricRow
                label="Compartilhamentos"
                metric={metrics.reach.shares}
                icon={Share2}
                share={reachShares.shares}
              />
              <ReachMetricRow
                label="Curtidas"
                metric={metrics.reach.likes}
                icon={Heart}
                share={reachShares.likes}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-white/60" />
              <CardTitle>Top mídias</CardTitle>
            </div>
            <CardDescription>
              Ranking dos 10 conteúdos com melhor desempenho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={topMediaSort}
              onValueChange={(value) => setTopMediaSort(value as TopMediaSortKey)}
            >
              <TabsList className="mb-4 flex-wrap">
                <TabsTrigger value="likes">Mais curtidas</TabsTrigger>
                <TabsTrigger value="shares">Mais compartilhadas</TabsTrigger>
                <TabsTrigger value="downloads">Mais baixadas</TabsTrigger>
              </TabsList>

              {(["likes", "shares", "downloads"] as const).map((sortKey) => {
                const rankedItems = sortTopMedia(metrics.topMedia, sortKey);

                return (
                  <TabsContent key={sortKey} value={sortKey} className="space-y-3">
                    {rankedItems.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
                        Nenhuma mídia publicada ainda.
                      </p>
                    ) : (
                      rankedItems.map((item, index) => (
                        <TopMediaRow key={item.id} rank={index + 1} item={item} />
                      ))
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-white/60" />
              <CardTitle>Cabine virtual</CardTitle>
            </div>
            <CardDescription>
              Distribuição dos formatos publicados no evento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {metrics.cabineBreakdown.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <CabineIcon type={item.key} />
                    <span>{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {item.percentage}%
                    </p>
                    <p className="text-xs text-white/35">
                      {formatMetricNumber(item.count)} mídias
                    </p>
                  </div>
                </div>
                <Progress value={item.percentage} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-white/60" />
              <CardTitle>Atividade do evento</CardTitle>
            </div>
            <CardDescription>
              Uploads ao longo do tempo para identificar horários de pico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 text-sm text-white/40">
                Sem uploads registrados ainda.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={activityData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="uploadActivityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={{ color: "rgba(255,255,255,0.55)" }}
                      formatter={(value) => [
                        formatMetricNumber(Number(value)),
                        "Uploads",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="uploads"
                      stroke="rgba(255,255,255,0.75)"
                      strokeWidth={2}
                      fill="url(#uploadActivityFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#f8fafc" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-white/60" />
            <CardTitle>Engajamento por mídia</CardTitle>
          </div>
          <CardDescription>
            Médias gerais do evento com base em{" "}
            {formatMetricNumber(metrics.engagementAverages.publishedMediaCount)}{" "}
            mídias publicadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {averageCards.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.25rem] border border-white/8 bg-black/20 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/45">{item.label}</p>
                    <div className="mt-3">
                      {item.tracked ? (
                        <p className="text-3xl font-black tracking-tight text-white">
                          {formatMetricAverage(item.value)}
                        </p>
                      ) : (
                        <MetricComingSoon compact />
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-white/50">
                    <item.icon className="size-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      ) : null}
    </section>
  );
}
