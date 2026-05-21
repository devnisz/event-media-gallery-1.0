-- Fase 1 SaaS: perfis e métricas básicas para Master Admin.
-- Execute manualmente no SQL Editor do Supabase.
-- Não altera policies existentes de events/media.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  role text not null default 'customer' check (role in ('master_admin', 'customer', 'operator')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

alter table public.media
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0);

create index if not exists media_file_size_owner_idx on public.media (owner_user_id, file_size_bytes);

-- Promova o seu usuário depois de criar a tabela:
--
-- insert into public.profiles (id, email, role, status)
-- select id, email, 'master_admin', 'active'
-- from auth.users
-- where email = 'SEU_EMAIL_AQUI'
-- on conflict (id) do update
-- set email = excluded.email,
--     role = 'master_admin',
--     status = 'active',
--     updated_at = now();
