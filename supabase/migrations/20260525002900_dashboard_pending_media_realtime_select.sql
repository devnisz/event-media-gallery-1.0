-- Permite que o dashboard autenticado receba uploads pendentes via Realtime.
-- A policy publica continua restrita a review_status = 'approved'.

drop policy if exists "media_owner_select_dashboard" on public.media;
create policy "media_owner_select_dashboard"
  on public.media
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.events e
      where e.id = media.event_id
        and e.owner_user_id = auth.uid()
    )
  );
