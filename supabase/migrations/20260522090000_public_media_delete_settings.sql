-- Fase: controle de exclusao publica de midias por evento.
-- Execute manualmente no Supabase antes de publicar o codigo que usa estas colunas.

alter table public.events
  add column if not exists allow_public_delete boolean not null default false,
  add column if not exists require_delete_pin boolean not null default false,
  add column if not exists delete_pin_hash text;

-- deleted_by nasceu como uuid na fase anterior. Para exclusao publica, ele precisa
-- aceitar um marcador identificavel como 'public', preservando UUIDs existentes.
alter table public.media
  drop constraint if exists media_deleted_by_fkey;

alter table public.media
  alter column deleted_by type text using deleted_by::text;

comment on column public.media.deleted_by is
  'Identificador de quem executou o soft-delete: UUID do usuario ou marcador public.';

comment on column public.events.allow_public_delete is
  'Permite que visitantes da galeria publica solicitem soft-delete de midias do evento.';

comment on column public.events.require_delete_pin is
  'Quando true, exclusao publica exige PIN validado no servidor.';

comment on column public.events.delete_pin_hash is
  'Hash com salt do PIN de exclusao publica. Nunca armazenar PIN em texto puro.';

-- A tabela events tem SELECT publico por policy. Esta revogacao protege apenas a
-- coluna sensivel para que clientes anon/authenticated nao consigam ler o hash.
revoke select (delete_pin_hash) on public.events from anon, authenticated;
