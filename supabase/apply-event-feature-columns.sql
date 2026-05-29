-- Cole e execute no SQL Editor do Supabase (uma vez por projeto).
-- Idempotente: pode rodar de novo sem problema.
-- Equivale às migrations:
--   20260529120000_event_cabine_virtual_config.sql
--   20260529140000_event_cabine_virtual_sources.sql
--   20260529160000_event_live_moments.sql

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

alter table public.events
  add column if not exists cabine_virtual_camera_enabled boolean not null default true;

alter table public.events
  add column if not exists cabine_virtual_gallery_import_enabled boolean not null default true;

alter table public.events
  add column if not exists live_moments_enabled boolean not null default false;
