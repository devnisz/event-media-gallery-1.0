# Checklist — migração JSON → Supabase

Use esta lista quando for ativar o Postgres em ambiente que hoje usa só arquivos locais.

## Pré-requisitos

- [ ] Projeto Supabase criado.
- [ ] `schema.sql` aplicado sem erros.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidos no app.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` definida no servidor (Vercel / host Node), **não** no client.

## Dados

- [ ] Exportar conteúdo atual de `data/events.json` e `data/videos.json` (backup).
- [ ] Inserir eventos na tabela `events` (ids, slugs, tokens, `cover_image`, `videos_count`, `created_at`).
- [ ] Inserir mídias na tabela `media` com `event_id` e `event_slug` coerentes com cada registro.
- [ ] Validar um evento no admin + watcher com token (POST validate).

## Comportamento da app

- [ ] Com Supabase **vazio** e JSON preenchido: a app lê Supabase primeiro — **planeje import** antes de apontar produção, ou deixe Supabase desconfigurado até migrar.
- [ ] Após import: abrir home, página de evento, página de mídia, exclusão de item, exclusão de evento.
- [ ] (Opcional) `GALLERY_DUAL_WRITE_LEGACY_JSON=1` durante uma fase de observação; depois desligar e remover JSON em disco quando confiar só no DB.

## Segurança pós-MVP

- [ ] Substituir políticas RLS `*_dev_all` por políticas restritivas ou JWT.
- [ ] Rotacionar `SERVICE_ROLE` se exposta por engano.

## Validação técnica

- [ ] `npm run lint`
- [ ] `npm run build`
