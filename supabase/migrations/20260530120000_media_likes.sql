-- Curtidas públicas (contador + deduplicação por visitante anônimo)

alter table public.events
  add column if not exists allow_likes boolean not null default false;

alter table public.media
  add column if not exists likes_count integer not null default 0;

alter table public.media
  drop constraint if exists media_likes_count_check;

alter table public.media
  add constraint media_likes_count_check
  check (likes_count >= 0);

create index if not exists media_event_likes_count_idx
  on public.media (event_id, likes_count desc);

create table if not exists public.media_likes (
  media_id text not null references public.media (id) on delete cascade,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  primary key (media_id, visitor_key)
);

create index if not exists media_likes_media_id_idx
  on public.media_likes (media_id);

comment on column public.events.allow_likes is
  'Permite curtidas publicas na galeria do evento.';

comment on column public.media.likes_count is
  'Total de curtidas (desnormalizado para realtime simples).';

comment on table public.media_likes is
  'Curtidas anonimas por visitante (sem perfil publico).';

alter table public.media_likes enable row level security;
