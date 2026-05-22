import Link from "next/link";
import { CopyPublicLinkButton } from "@/components/dashboard/copy-public-link-button";
import { EventCover } from "@/components/dashboard/event-cover";
import { EventGallerySettingsForm } from "@/components/dashboard/event-gallery-settings-form";
import { EventMediaManager } from "@/components/dashboard/event-media-manager";
import { QrCode } from "@/components/public/qr-code";
import { getDashboardEventDetail } from "@/lib/dashboard/queries";
import { routes } from "@/lib/routes";
import { requireSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type DashboardEventPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default async function DashboardEventPage({
  params,
}: DashboardEventPageProps) {
  const user = await requireSessionUser();
  const { id } = await params;
  const detail = await getDashboardEventDetail(user.id, decodeURIComponent(id));

  return (
    <main className="mx-auto max-w-7xl space-y-10 pb-16">
      <section className="space-y-6">
        <Link
          href={routes.dashboard}
          className="text-sm font-semibold text-white/50 hover:text-white"
        >
          Voltar aos eventos
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
              Gerenciamento do evento
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {detail.event.name}
            </h1>
            <p className="mt-2 font-mono text-sm text-white/45">
              {detail.event.slug}
            </p>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-white/40">Mídias</p>
                <p className="mt-1 text-2xl font-black">{detail.mediaCount}</p>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-white/40">Favoritas</p>
                <p className="mt-1 text-2xl font-black">
                  {detail.favoriteCount}
                </p>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-white/40">Ocultas</p>
                <p className="mt-1 text-2xl font-black">{detail.hiddenCount}</p>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-white/40">Atualização</p>
                <p className="mt-1 text-sm font-bold">
                  {formatDate(detail.lastUpdatedAt)}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white/45">Link público</p>
              <p className="mt-2 break-all font-mono text-sm text-amber-100">
                {detail.publicUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <CopyPublicLinkButton value={detail.publicUrl} />
                <Link
                  href={detail.publicPath}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-bold text-white/80 transition hover:bg-white/10"
                >
                  Abrir galeria
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <EventCover
              src={detail.displayCover}
              name={detail.event.name}
              className="h-64"
            />
            <QrCode
              label={detail.event.name}
              value={detail.publicUrl}
            />
          </div>
        </div>
      </section>

      <EventGallerySettingsForm
        eventId={detail.event.id}
        initialAllowPublicDelete={detail.event.allowPublicDelete}
        initialRequireDeletePin={detail.event.requireDeletePin}
        initialAllowGuestUpload={detail.event.allowGuestUpload}
        hasDeletePin={Boolean(detail.event.deletePinHash?.trim())}
      />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black tracking-tight">Uploads recentes</h2>
        {detail.recentUploads.length === 0 ? (
          <p className="mt-4 text-white/50">Nenhum upload recebido ainda.</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {detail.recentUploads.map((media) => (
              <div
                key={media.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <p className="line-clamp-1 font-bold">{media.name}</p>
                <p className="mt-1 text-sm text-white/45">
                  {media.mediaType.toUpperCase()} ·{" "}
                  {formatDate(media.uploadedAt ?? media.createdAt ?? "")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <EventMediaManager initialMedia={detail.media} />
    </main>
  );
}
