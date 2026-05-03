-- Galeria: schema PostgreSQL (Supabase)
-- Executar no SQL Editor do projeto Supabase ou via CLI.

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id text primary key,
  slug text not null unique,
  name text not null,
  upload_token text not null,
  created_at timestamptz not null default now(),
  cover_image text not null default '',
  videos_count integer not null default 0
);

create index if not exists events_slug_idx on public.events (slug);

-- ---------------------------------------------------------------------------
-- media (vídeo, imagem, GIF — modelo unificado)
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  event_slug text not null,
  name text not null default 'Mídia',
  media_type text not null,
  file_type text not null,
  url text not null,
  thumbnail_url text,
  qr_code text not null,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  legacy_timestamp text,
  order_index integer
);

create index if not exists media_event_id_idx on public.media (event_id);
create index if not exists media_event_slug_idx on public.media (event_slug);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Desenvolvimento: políticas permissivas com anon (substituir em produção).
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.media enable row level security;

drop policy if exists "events_dev_all" on public.events;
create policy "events_dev_all"
  on public.events
  for all
  using (true)
  with check (true);

drop policy if exists "media_dev_all" on public.media;
create policy "media_dev_all"
  on public.media
  for all
  using (true)
  with check (true);
