-- Fase 2 SaaS: estado de mídia para dashboard do cliente.
-- Execute manualmente no SQL Editor do Supabase.
-- Não altera policies RLS existentes.

alter table public.media
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null;

create index if not exists media_active_event_idx
  on public.media (event_id, created_at desc)
  where deleted_at is null;

create index if not exists media_dashboard_state_idx
  on public.media (event_id, is_hidden, is_favorite, deleted_at);
