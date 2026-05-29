alter table public.events
  add column if not exists gallery_layout text not null default 'premium';

alter table public.events
  drop constraint if exists events_gallery_layout_check;

alter table public.events
  add constraint events_gallery_layout_check
  check (gallery_layout in ('premium', 'social'));

comment on column public.events.gallery_layout is
  'Layout publico da galeria: premium (padrao) ou social (mosaico estilo feed).';
