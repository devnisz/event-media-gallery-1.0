alter table public.events
  add column if not exists frame_url text not null default '';

comment on column public.events.frame_url is
  'URL pública opcional de moldura PNG transparente para a Cabine de Bolso.';
