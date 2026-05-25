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
  videos_count integer not null default 0,
  allow_public_delete boolean not null default false,
  require_delete_pin boolean not null default false,
  delete_pin_hash text,
  allow_guest_upload boolean not null default false,
  require_guest_upload_approval boolean not null default false,
  owner_user_id uuid references auth.users (id) on delete set null
);

create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_owner_user_id_idx on public.events (owner_user_id);

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
  order_index integer,
  is_hidden boolean not null default false,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  media_source text not null default 'operator',
  review_status text not null default 'approved',
  owner_user_id uuid references auth.users (id) on delete set null
);

alter table public.media
  drop constraint if exists media_source_check;

alter table public.media
  add constraint media_source_check
  check (media_source in ('operator', 'guest'));

alter table public.media
  drop constraint if exists media_review_status_check;

alter table public.media
  add constraint media_review_status_check
  check (review_status in ('approved', 'pending', 'rejected'));

create index if not exists media_event_id_idx on public.media (event_id);
create index if not exists media_event_slug_idx on public.media (event_slug);
create index if not exists media_owner_user_id_idx on public.media (owner_user_id);
create index if not exists media_source_event_idx
  on public.media (event_id, media_source, created_at desc);
create index if not exists media_event_review_status_idx
  on public.media (event_id, review_status, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (Fase 1 — leitura pública; mutação por dono com JWT)
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.media enable row level security;

drop policy if exists "events_dev_all" on public.events;
drop policy if exists "media_dev_all" on public.media;

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public"
  on public.events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "media_select_public" on public.media;
create policy "media_select_public"
  on public.media
  for select
  to anon, authenticated
  using (review_status = 'approved');

drop policy if exists "media_owner_select_dashboard" on public.media;
create policy "media_owner_select_dashboard"
  on public.media
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.events e
      where e.id = media.event_id
        and e.owner_user_id = auth.uid()
    )
  );

drop policy if exists "events_owner_insert" on public.events;
create policy "events_owner_insert"
  on public.events
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update"
  on public.events
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete"
  on public.events
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "media_owner_insert" on public.media;
create policy "media_owner_insert"
  on public.media
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "media_owner_update" on public.media;
create policy "media_owner_update"
  on public.media
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "media_owner_delete" on public.media;
create policy "media_owner_delete"
  on public.media
  for delete
  to authenticated
  using (owner_user_id = auth.uid());
