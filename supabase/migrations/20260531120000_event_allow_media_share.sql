alter table public.events
  add column if not exists allow_media_share boolean not null default true;

comment on column public.events.allow_media_share is
  'Permite compartilhar midias individuais (link /video/id) na galeria publica.';
