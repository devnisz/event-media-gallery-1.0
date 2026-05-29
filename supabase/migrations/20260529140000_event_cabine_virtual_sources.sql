alter table public.events
  add column if not exists cabine_virtual_camera_enabled boolean not null default true;

alter table public.events
  add column if not exists cabine_virtual_gallery_import_enabled boolean not null default true;

comment on column public.events.cabine_virtual_camera_enabled is
  'Permite captura por camera na Cabine Virtual (foto e video).';

comment on column public.events.cabine_virtual_gallery_import_enabled is
  'Permite importar foto ou video da galeria do dispositivo na Cabine Virtual.';
