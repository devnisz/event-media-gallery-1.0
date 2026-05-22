-- Fase 1: uploads publicos dos convidados.
-- Execute manualmente no Supabase antes de habilitar a funcionalidade no dashboard.

alter table public.events
  add column if not exists allow_guest_upload boolean not null default false;

comment on column public.events.allow_guest_upload is
  'Permite upload publico sem login por convidados na galeria do evento.';

alter table public.media
  add column if not exists media_source text not null default 'operator';

alter table public.media
  drop constraint if exists media_source_check;

alter table public.media
  add constraint media_source_check
  check (media_source in ('operator', 'guest'));

comment on column public.media.media_source is
  'Origem da midia: operator para watcher/fluxo oficial, guest para upload publico.';

create index if not exists media_source_event_idx
  on public.media (event_id, media_source, created_at desc);
