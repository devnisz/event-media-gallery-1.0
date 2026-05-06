-- Fase 1 SaaS: ownership + preparação RLS (galeria pública continua legível).
-- Aplicar no SQL Editor do Supabase ou via CLI após backup.

-- ---------------------------------------------------------------------------
-- Colunas de propriedade (nullable = migração gradual)
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

alter table public.media
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

create index if not exists events_owner_user_id_idx on public.events (owner_user_id);
create index if not exists media_owner_user_id_idx on public.media (owner_user_id);

-- ---------------------------------------------------------------------------
-- RLS: substitui políticas "dev_all" por leitura pública + escrita por dono
-- (service_role do Next continua ignorando RLS para jobs server-side).
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
  using (true);

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
