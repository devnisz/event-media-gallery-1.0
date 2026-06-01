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

import { Badge } from "@/components/ui/badge";
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

function MetricValue({
  metric,
  className,
}: {
  metric: EngagementMetricValue;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <p className="text-3xl font-black tracking-tight text-white sm:text-4xl">
        {formatMetricNumber(metric.value)}
      </p>
      {!metric.tracked ? (
        <Badge variant="muted" className="mb-1">
          Em breve
        </Badge>
      ) : null}
    </div>
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
          {!metric.tracked ? (
            <Badge variant="muted">Em breve</Badge>
          ) : (
            <span className="text-xs text-white/35">{share}%</span>
          )}
        </div>
      </div>
      <Progress
        value={metric.tracked ? share : 0}
        indicatorClassName={metric.tracked ? "bg-white/75" : "bg-white/15"}
      />
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
            alt={item.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/25">
            <ImageIcon className="size-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-white/35">
          {item.mediaType}
        </p>
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

export function EventEngagementDashboard({
  metrics,
}: EventEngagementDashboardProps) {
  const [topMediaSort, setTopMediaSort] = useState<TopMediaSortKey>("likes");

  const summaryCards: SummaryCardConfig[] = [
    {
      id: "views",
      label: "Visualizações",
      metric: metrics.summary.views,
      icon: Eye,
    },
    {
      id: "published",
      label: "Mídias publicadas",
      metric: metrics.summary.publishedMedia,
      icon: ImageIcon,
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
      id: "likes",
      label: "Curtidas",
      metric: metrics.summary.likes,
      icon: Heart,
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
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200">
          Engajamento
        </p>
        <h2 className="text-3xl font-black tracking-tight text-white">
          Dashboard de Engajamento
        </h2>
        <p className="max-w-2xl text-sm text-white/45">
          Visão rápida do impacto do evento. Métricas com coleta ativa usam
          dados reais; demais indicadores já estão preparados para integração
          futura.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </div>

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
                  <div>
                    <p className="text-sm text-white/45">{item.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">
                      {item.tracked
                        ? formatMetricAverage(item.value)
                        : formatMetricNumber(item.value)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-white/50">
                    <item.icon className="size-4" />
                  </div>
                </div>
                {!item.tracked ? (
                  <Badge variant="muted" className="mt-4">
                    Em breve
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
