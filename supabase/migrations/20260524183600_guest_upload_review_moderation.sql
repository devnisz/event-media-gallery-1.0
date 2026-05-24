-- Fase 2: moderacao opcional de uploads publicos dos convidados.
-- Execute manualmente no Supabase antes de publicar o codigo que usa estas colunas.

alter table public.events
  add column if not exists require_guest_upload_approval boolean not null default false;

comment on column public.events.require_guest_upload_approval is
  'Quando true, uploads publicos de convidados ficam pendentes ate aprovacao no dashboard.';

alter table public.media
  add column if not exists review_status text not null default 'approved';

alter table public.media
  drop constraint if exists media_review_status_check;

alter table public.media
  add constraint media_review_status_check
  check (review_status in ('approved', 'pending', 'rejected'));

comment on column public.media.review_status is
  'Status de moderacao da midia: approved, pending ou rejected.';

create index if not exists media_event_review_status_idx
  on public.media (event_id, review_status, created_at desc);

update public.media
  set review_status = 'approved'
  where review_status is null;

drop policy if exists "media_select_public" on public.media;
create policy "media_select_public"
  on public.media
  for select
  to anon, authenticated
  using (review_status = 'approved');
