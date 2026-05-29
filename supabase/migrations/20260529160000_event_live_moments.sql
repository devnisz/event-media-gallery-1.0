alter table public.events
  add column if not exists live_moments_enabled boolean not null default false;

comment on column public.events.live_moments_enabled is
  'Exibe Momentos ao Vivo no topo da galeria publica do evento.';
