alter table public.events
  add column if not exists cabine_virtual_enabled boolean not null default true;

alter table public.events
  add column if not exists cabine_virtual_photo_enabled boolean not null default true;

alter table public.events
  add column if not exists cabine_virtual_boomerang_enabled boolean not null default true;

alter table public.events
  add column if not exists cabine_virtual_video_enabled boolean not null default false;

alter table public.events
  add column if not exists cabine_virtual_video_max_duration_seconds integer not null default 10;

alter table public.events
  drop constraint if exists events_cabine_virtual_video_duration_check;

alter table public.events
  add constraint events_cabine_virtual_video_duration_check
  check (
    cabine_virtual_video_max_duration_seconds >= 5
    and cabine_virtual_video_max_duration_seconds <= 30
  );

comment on column public.events.cabine_virtual_enabled is
  'Exibe a Cabine Virtual na galeria publica do evento.';

comment on column public.events.cabine_virtual_photo_enabled is
  'Permite captura de foto na Cabine Virtual.';

comment on column public.events.cabine_virtual_boomerang_enabled is
  'Permite captura de Boomerang na Cabine Virtual.';

comment on column public.events.cabine_virtual_video_enabled is
  'Permite gravacao de video curto na Cabine Virtual.';

comment on column public.events.cabine_virtual_video_max_duration_seconds is
  'Duracao maxima (segundos) da gravacao de video na Cabine Virtual (5-30).';
