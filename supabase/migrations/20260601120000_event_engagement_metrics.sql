-- Métricas reais de engajamento (visualizações, downloads, compartilhamentos)

alter table public.events
  add column if not exists view_count integer not null default 0;

alter table public.events
  add column if not exists download_count integer not null default 0;

alter table public.events
  add column if not exists share_count integer not null default 0;

alter table public.events
  drop constraint if exists events_view_count_check;

alter table public.events
  add constraint events_view_count_check check (view_count >= 0);

alter table public.events
  drop constraint if exists events_download_count_check;

alter table public.events
  add constraint events_download_count_check check (download_count >= 0);

alter table public.events
  drop constraint if exists events_share_count_check;

alter table public.events
  add constraint events_share_count_check check (share_count >= 0);

alter table public.media
  add column if not exists view_count integer not null default 0;

alter table public.media
  add column if not exists download_count integer not null default 0;

alter table public.media
  add column if not exists share_count integer not null default 0;

alter table public.media
  drop constraint if exists media_view_count_check;

alter table public.media
  add constraint media_view_count_check check (view_count >= 0);

alter table public.media
  drop constraint if exists media_download_count_check;

alter table public.media
  add constraint media_download_count_check check (download_count >= 0);

alter table public.media
  drop constraint if exists media_share_count_check;

alter table public.media
  add constraint media_share_count_check check (share_count >= 0);

create index if not exists media_event_view_count_idx
  on public.media (event_id, view_count desc);

create index if not exists media_event_download_count_idx
  on public.media (event_id, download_count desc);

create index if not exists media_event_share_count_idx
  on public.media (event_id, share_count desc);

create table if not exists public.event_gallery_view_sessions (
  event_id text not null references public.events (id) on delete cascade,
  visitor_key text not null,
  last_viewed_at timestamptz not null default now(),
  primary key (event_id, visitor_key)
);

create index if not exists event_gallery_view_sessions_event_id_idx
  on public.event_gallery_view_sessions (event_id);

create table if not exists public.media_view_sessions (
  media_id text not null references public.media (id) on delete cascade,
  visitor_key text not null,
  last_viewed_at timestamptz not null default now(),
  primary key (media_id, visitor_key)
);

create index if not exists media_view_sessions_media_id_idx
  on public.media_view_sessions (media_id);

comment on column public.events.view_count is
  'Visualizações da galeria pública (/evento/slug), com deduplicação por visitante.';

comment on column public.events.download_count is
  'Total de downloads de mídias do evento (desnormalizado).';

comment on column public.events.share_count is
  'Total de compartilhamentos de mídias do evento (desnormalizado).';

comment on column public.media.view_count is
  'Visualizações da mídia (viewer ou página /video), com deduplicação por visitante.';

comment on column public.media.download_count is
  'Cliques em baixar mídia.';

comment on column public.media.share_count is
  'Cliques em compartilhar mídia.';

alter table public.event_gallery_view_sessions enable row level security;
alter table public.media_view_sessions enable row level security;
