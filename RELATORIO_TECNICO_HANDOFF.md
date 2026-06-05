# Relatório técnico — Gallery (event-media-gallery)

**Propósito deste documento:** transferência completa de contexto para outra sessão, equipe ou ferramenta de IA continuar o desenvolvimento sem perda de estado mental do projeto.

**Stack base verificada no repositório:** Next.js **16.2.4**, React **19.2.4**, TypeScript **5**, Tailwind **4**, `@supabase/supabase-js` **2.105.1**, `@aws-sdk/client-s3` **3.1041.0**.

---

## 1. VISÃO GERAL

### 1.1 Objetivo da plataforma

Aplicação **galeria pública de mídias** (vídeo, imagem, GIF) associadas a **eventos**. Cada evento tem slug, nome, contagem de mídias, capa derivada e um **token opaco de upload** (`uploadToken`) usado por integrações externas (watcher / uploader) para validar envios. Há um **painel administrativo** em `/admin` para criar eventos, copiar credenciais do watcher e excluir eventos (com cascata de limpeza). A persistência é **híbrida**: Supabase (PostgreSQL) quando configurado, com **fallback** para arquivos JSON em `data/` e assets em `public/`; opcionalmente **dual-write** para JSON durante migração.

### 1.2 Arquitetura geral

- **Camada de apresentação:** App Router do Next.js (`app/`), componentes públicos (`components/public/`) e admin (`components/admin/`).
- **Domínio / orquestração:** `services/` (`eventService`, `mediaService` como facade de vídeo, `storageService` para JSON, `tokenService`, `eventDeletionService`).
- **Persistência / adapters:** `repositories/` (`eventRepository`, `mediaRepository`) escolhem Supabase vs JSON.
- **Infra config:** `lib/supabase/*`, `lib/r2/removal.ts`, `lib/paths.ts`, `lib/routes.ts`.
- **Edge da API:** Route Handlers em `app/api/*` (criação de evento, exclusão, validação watcher, exclusão de vídeo).
- **Auth:** **não implementada**; `middleware.ts` só faz `NextResponse.next()` em `/admin`; tipos futuros em `lib/auth/types.ts` e matriz estática em `lib/permissions.ts`.

### 1.3 Fluxo principal do sistema

1. **Operador** acessa `/admin`, cria evento → `POST /api/events` → `createEventRecordWithPersistence` → escrita em Supabase e/ou JSON conforme envs.
2. **Operador** copia `eventId` + `uploadToken` (snippet formatado) para configurar o **watcher/uploader** externo.
3. **Watcher** (fora deste repo ou integrado) envia mídia; validação pode usar `POST /api/watcher/validate` com corpo `{ eventId, uploadToken }` → `validateWatcherCredentials` lê eventos hidratados (JSON + Supabase via `readEvents`/repositório).
4. **Visitante** abre `/` → lista eventos enriquecidos com capa; abre `/evento/[slug]` → `getEventVideosForEventSlug` → galeria com **Realtime** Supabase (INSERT em `media`) quando o client browser tem `NEXT_PUBLIC_*`.
5. **Visitante** abre `/video/[id]` → player / download / QR.
6. **Exclusão** de vídeo: client chama `DELETE /api/videos/[id]` → `deleteGalleryVideo`. **Exclusão** de evento: `DELETE /api/events/[eventId]` → `deleteEventAndRelatedAssets` (JSON, R2, arquivos locais em `public/`).

### 1.4 Stack utilizada

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router, RSC, Turbopack no build) |
| UI | React 19, Tailwind 4 (PostCSS) |
| Dados | Supabase Postgres + fallback `data/*.json` |
| Objeto | Cloudflare R2 via API S3-compatível (remoção / prefixos) |
| Deploy típico | Vercel (Node serverless para rotas API) |

---

## 2. FRONTEND

### 2.1 Estrutura Next.js

- **`app/layout.tsx`** — shell raiz.
- **`app/(public)/layout.tsx`** — layout rota pública.
- **`app/(admin)/layout.tsx`** — layout admin.
- **`app/(public)/page.tsx`** — home com grid de eventos, link destacado para `/admin`.
- **`app/(public)/evento/[slug]/page.tsx`** — galeria do evento; `dynamic = "force-dynamic"`; `VideoGallery` com `key={event.slug}`; props `eventSlug`, `eventName`, `eventId`.
- **`app/(public)/video/[id]/page.tsx`** — página da mídia isolada (player, download, QR).
- **`app/(public)/videos/[slug]/page.tsx`** — rota legada por slug.
- **`app/(admin)/admin/page.tsx`** — dashboard de eventos (server component lê `readEvents`).

### 2.2 Páginas principais

| Rota | Função |
|------|--------|
| `/` | Lista eventos (`EventsGrid`) |
| `/evento/[slug]` | Galeria (`VideoGallery`) + Realtime |
| `/video/[id]` | Detalhe mídia (`VideoPlayer`, `DownloadButton`, `QrCode`) |
| `/videos/[slug]` | Alias legado |
| `/admin` | CRUD simplificado de eventos (criar / credenciais / excluir) |

### 2.3 Componentes importantes (público)

- **`video-gallery.tsx`** — estado da lista; Supabase Realtime (`postgres_changes` INSERT `public.media`); normalização de payload (`normalizeRealtimeInsert`); filtro por `event_slug` / `event_id` (case-insensitive); grelha responsiva (até 4 colunas em `xl`); modo mobile 1 ou 2 colunas com preferência `localStorage` (`gallery-mobile-two-cols`); prop `compactMobileTwoCol` no `VideoCard`.
- **`video-card.tsx`** — cartão com link, thumbnail, exclusão (DELETE API), variantes compactas no mobile 2-col.
- **`video-player.tsx`**, **`video-thumbnail.tsx`**, **`media-stage.tsx`**, **`media-badge.tsx`** — reprodução e tipos de mídia.
- **`download-button.tsx`** — download via `fetch` + blob (cross-origin R2).
- **`qr-code.tsx`**, **`ambient-background.tsx`**, **`events-grid.tsx`**, **`event-card.tsx`**.

### 2.4 Componentes importantes (admin)

- **`admin-events-dashboard.tsx`** — dialogs para criar evento, mostrar snippet watcher (`formatWatcherCredentialsSnippet`), excluir evento (chamada `DELETE /api/events/:id`), toasts.
- **`admin-shell.tsx`**, **`admin-toast.tsx`**.

### 2.5 Fluxo da galeria

1. Server: `getEventVideosForEventSlug(slug, event.id)` → `readPersistedMediaRawForEventSlug` → ordenação `sortGalleryMediaRecords` → `toEventMedia` (via `lib/media/galleryMapping.ts` + `mediaService`).
2. Client: `VideoGallery` inicializa `videos` com `initialVideos`.
3. Realtime: ao INSERT, filtra evento; `tryRealtimeRowToEventMedia`; `setVideos` com prepênd e dedupe por `id`.

### 2.6 Realtime (browser)

- **`lib/supabase/client.ts`** — singleton `createBrowserSupabase()` retorna `null` se faltar `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sem throw).
- Canal nomeado `gallery_media:${eventSlug}:${eventId ?? ""}`.
- Subscribe com callback de **status** (`SUBSCRIBED`, `CHANNEL_ERROR`, etc.) e logs `[REALTIME]`.
- **Requisito Supabase (fora do código):** publicação Realtime na tabela `media` e RLS/policies que permitam ao cliente anon **receber** eventos (o `schema.sql` incluído usa políticas `*_dev_all` permissivas — revisar antes de produção fechada).

### 2.7 Autenticação

- **Não há login.** `UserRole`, `Permission`, `AuthSession` são **contratos futuros**. `middleware` não protege admin.

### 2.8 Problemas conhecidos (frontend)

- **`/admin` e link “Painel” na home são públicos** — risco operacional alto.
- Realtime depende de envs `NEXT_PUBLIC_*` e configuração Supabase; silêncio se cliente null.
- Título compacto em 2 colunas no mobile trunca agressivamente (~10% chars) — revisão de UX possível.
- Next.js 16 avisa depreciação **`middleware`** em favor de **`proxy`** (mensagem de build).

### 2.9 Melhorias pendentes (frontend)

- Proteger `/admin` (middleware + sessão).
- Opcional: `loading.tsx` / `error.tsx` por segmento.
- Reduzir logs `[REALTIME]` em produção ou usar flag de debug.

---

## 3. BACKEND / SERVER

### 3.1 APIs (Route Handlers)

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/api/events` | Cria evento (`createEventRecordWithPersistence`), `revalidatePath` |
| `DELETE` | `/api/events/[eventId]` | `deleteEventAndRelatedAssets`, `runtime: nodejs` |
| `DELETE` | `/api/videos/[id]` | `deleteGalleryVideo` |
| `POST` | `/api/watcher/validate` | Valida `eventId` + `uploadToken` (timing-safe) |

Não há API REST completa para upload de arquivos **dentro deste projeto**; upload provavelmente ocorre no serviço **video-uploader** / R2 direto.

### 3.2 Serviços (resumo)

- **`eventService`** — leitura/escrita de eventos via repositório + hidratação de tokens.
- **`mediaService`** — leitura geral, por slug, `getMediaById`, ordenação, exclusão, reconciliação de contagens, URLs públicas (`buildPublicPageUrl` reexportada), mutações em disco + R2 unlink.
- **`storageService`** — `data/events.json`, `data/videos.json` com escrita atômica (`rename` após tmp).
- **`tokenService`** — `validateWatcherCredentials`, `compareUploadTokens`, hidratação de tokens em eventos legados.
- **`eventDeletionService`** — orquestra remoção JSON, R2 (prefixo por mídia + sidecars thumbnails/qrcodes), arquivos em `public/`.

### 3.3 Fluxo watcher (neste repositório)

- **Contrato:** `lib/watcher/contract.ts` (`WatcherGalleryBinding`, `WatcherCredentialsPayload`).
- **Validação:** `POST /api/watcher/validate` → `tokenService.validateWatcherCredentials` contra lista de eventos **persistida** (Supabase + fallback, conforme leitura em `readEvents`).
- **Admin:** gera snippet `EVENT_ID=…` / `UPLOAD_TOKEN=…` via `formatWatcherCredentialsSnippet`.
- **Código do daemon watcher**, pastas monitoradas, FFmpeg, upload para R2 — **não estão neste repositório** (espera-se projeto irmão, ex.: `video-uploader`). Este app é a **galeria + API de validação + persistência**.

### 3.4 Processamento de mídia

- Inferência de tipo: `utils/mediaInference.ts` (`inferMediaKind`, `inferFileType`).
- Normalização de linhas Supabase/JSON: `repositories/mediaRepository.ts` (`rowToLegacyJson`), `lib/media/galleryMapping.ts` para UI.

### 3.5 Upload

- Não há rota multipart neste app; inserts em `media` presumem pipeline externo (uploader) ou admin futuro.

### 3.6 Sincronização

- **JSON ↔ Supabase:** repositórios fazem upsert/select; opcional `GALLERY_DUAL_WRITE_LEGACY_JSON`.
- **Contadores:** `reconcileAllEventCounts`/`videosCount` em eventos após operações.

### 3.7 Realtime (servidor)

- Realtime é **100% client-side** (Supabase JS no browser). Servidor não mantém canais.

### 3.8 Logs

Prefixos comuns: `[FRONTEND_MEDIA]`, `[REPOSITORY]`, `[MIGRATION]`, `[SUPABASE]`, `[EVENT_CREATE]`, `[REALTIME]`, `[eventDeletion:…]`. Úteis para Vercel/serverless logs.

---

## 4. SUPABASE

### 4.1 Tabelas existentes (schema versionado)

Arquivo: **`supabase/schema.sql`**.

**`public.events`**

- `id` (text, PK), `slug` (unique), `name`, `upload_token`, `created_at`, `cover_image`, `videos_count`.

**`public.media`**

- `id` (text, PK), `event_id` (FK → `events.id` ON DELETE CASCADE), `event_slug`, `name`, `media_type`, `file_type`, `url`, `thumbnail_url`, `qr_code`, `created_at`, `uploaded_at`, `legacy_timestamp`, `order_index`.

Índices em `event_id` e `event_slug`.

### 4.2 Relacionamentos

- **1 evento → N mídias** (`media.event_id` → `events.id`).
- Código aceita ingestões com **só `event_id`** (slug vazio no insert); galeria filtra Realtime por slug ou id.

### 4.3 Realtime (produto Supabase)

- Habilitar na UI Supabase para a tabela **`media`** (e publication `supabase_realtime`).
- Cliente usa `postgres_changes` / `INSERT` / `schema: public` / `table: media`.

### 4.4 RLS (estado do schema incluído)

- RLS **habilitado** em `events` e `media`.
- Políticas de **desenvolvimento:** `events_dev_all` e `media_dev_all` — `using (true)` / `with check (true)` — **equivalente a aberto para anon**. O próprio `MIGRATION_CHECKLIST.md` manda substituir antes de produção fechada.

### 4.5 Auth (Supabase)

- **Não integrado** no app (sem `signIn`, sem sessão Supabase no server components).

### 4.6 Estrutura atual e futura

- **Atual:** dual stack JSON + Postgres, service role no servidor para writes confiáveis.
- **Futuro:** RLS por `auth.uid()`, colunas `owner_user_id`, políticas por organização, eliminar políticas dev.

---

## 5. CLOUDFLARE R2

### 5.1 Organização

- **`lib/r2/removal.ts`** assume prefixo configurável `R2_KEY_PREFIX` (default `videos`).
- Por mídia, exclusão usa prefixo `{keyPrefix}/{mediaId}/` para listagem em lote.
- Sidecars adicionais: chaves fixas `thumbnails/{id}.jpg`, `qrcodes/{id}.png` (alinhado a comentários em `eventDeletionService`).

### 5.2 Paths e URLs públicas

- URLs finais de mídia vêm da colunas **`url`** / campos legados (`video_url`, `playback_url`, etc.) no repositório — tipicamente **públicos R2** ou domínio customizado configurado fora deste repo.
- **`lib/paths.ts`** — `galleryPublicPath` para `public/videos`, `public/thumbnails`, `public/qrcodes`, `public/images` usados em remoção local (`mediaService` / folders deletable).

### 5.3 Thumbnails / QR (persistência local vs R2)

- Exclusão de evento tenta R2 + unlink em disco sob `public/` conforme paths resolvidos em `mediaService`.

---

## 6. WATCHER LOCAL

### 6.1 O que existe **neste** projeto

- Tipos e snippet de config (`lib/watcher/*`).
- **Validação remota:** `POST /api/watcher/validate`.
- Documentação parcial em `supabase/README.md` + checklist migração.

### 6.2 Fluxo completo (lógico, ponta a ponta)

1. Admin cria evento → recebe `eventId` + `uploadToken`.
2. Operador coloca credenciais no **watcher** (config.json conforme contrato futuro completo).
3. Watcher valida via API (ou localmente contra JSON se offline).
4. Watcher faz upload para R2 / grava registro em `media` (Supabase ou API futura).
5. Galeria recebe INSERT via Realtime ou próximo carregamento server.

### 6.3 config.json / dashboard local / uploads / thumbnails / QR

- **Não implementados neste repositório.** Devem ser documentados no repositório do **uploader** ou extensão futura.

---

## 7. VERCEL

### 7.1 Configuração inferida

- Build: `npm run build` (Next 16 + Turbopack).
- **`next.config.ts`** — `turbopack.root` apontando para raiz do projeto (relevante se múltiplos `package-lock.json` no ambiente local).
- Sem `vercel.json` no repo (padrão Vercel).

### 7.2 Variáveis de ambiente utilizadas

Ver **secção 13** para lista completa. Críticas na Vercel:

- `NEXT_PUBLIC_SUPABASE_*` para client + Realtime.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` opcionais como espelho servidor-only (ver `config.ts`).
- `SUPABASE_SERVICE_ROLE_KEY` para operações server com RLS.
- `NEXT_PUBLIC_SITE_URL` ou fallback `VERCEL_URL` para URLs absolutas de QR/páginas.
- R2 para exclusão remota.

### 7.3 Problemas enfrentados (histórico recente)

- Builds falhando por TypeScript em `video-gallery` (`string | boolean` em retorno).
- JSX inválido (`console.log` dentro de `<VideoGallery>`).
- ESLint `react-hooks/set-state-in-effect` (resolvido com inicializador lazy de `useState` para `localStorage`).
- Confusão entre mensagem de **telemetria** do Next e erro real no log.
- **Browser:** apenas `NEXT_PUBLIC_*` é embutido; `SUPABASE_URL` sem prefixo não existe no bundle client.

### 7.4 Deploy atual

- Repositório remoto típico: `event-media-gallery` / `gallery` (histórico de commits com fixes de Realtime, grid, TS). Confirmar branch `main` no painel Vercel.

---

## 8. FUNCIONALIDADES JÁ FUNCIONANDO

- Home com listagem de eventos e contagem.
- Página de evento com galeria responsiva (1–4 colunas + modo mobile 1/2 colunas com persistência).
- Página de mídia individual com player e download por blob.
- Painel admin: criar evento, ver credenciais watcher, excluir evento (com limpeza ampla).
- API: criar evento, excluir evento, excluir vídeo, validar watcher.
- Persistência: Supabase **ou** JSON local; leitura unificada nos services.
- Realtime: INSERT em `media` reflete na galeria (com envs e Supabase configurados).
- Remoção R2 best-effort quando credenciais presentes.
- Dual-write opcional para JSON legado.
- Ordenação de mídia (manual `orderIndex` + datas).
- Tokens de upload com comparação **timing-safe**.

---

## 9. ROADMAP

### FASE 1 (URGENTE)

- **Supabase Auth** (email/OAuth) integrado ao Next (server + client).
- **`owner_user_id`** (ou equivalente) em `events` + políticas RLS.
- **Permissões básicas** (ligar `lib/permissions.ts` a claims reais).
- **Esconder `/admin`** (middleware, secret URL, ou login obrigatório).

### FASE 2

- **Dashboard contratante** (visão por cliente, não só operador técnico).
- **Export Google Drive** (job assíncrono, OAuth Google).
- **Analytics** (page views, shares, opcional Posthog/Plausible).

### FASE 3

- **Multiempresa** (organizações, billing).
- **Planos** e limites de armazenamento/eventos.
- **White-label** (domínio, tema).
- **Franquias** (hierarquia de tenants).

### FASE 4 (implícita — operação)

- Substituir políticas RLS dev.
- Observabilidade centralizada (Sentry, etc.).
- Backup e DR do Postgres.

---

## 10. ARQUITETURA FUTURA RECOMENDADA

- **Escalabilidade:** mover ingestão pesada para **worker** (fila + consumer) ou Edge Function; Next apenas orquestra e serve.
- **Segurança:** RLS estrito; service role só em backend; rotacionar segredos; WAF na Vercel.
- **Auth:** Supabase Auth + middleware Next validando sessão; roles em JWT custom claims ou tabela `profiles`.
- **Permissões:** ABAC/RBAC por `organization_id`.
- **Exportações:** workers com rate limit e storage temporário.
- **Workers:** BullMQ / Vercel Cron / Supabase pg_cron para reconciliação e limpeza.
- **Otimizações:** ISR/edge caching onde público for read-only; image CDN para thumbnails; reduzir payload Realtime (filtros server-side se possível).

---

## 11. DÍVIDAS TÉCNICAS / RISCOS

1. **Admin público** — maior vulnerabilidade atual.
2. **RLS dev “all true”** em schema versionado — risco se deployado ingenuamente em dados reais.
3. **Dois sistemas de verdade** (JSON + Supabase) — edge cases de ordem de leitura e migração (ver checklist).
4. **Singleton `createBrowserSupabase`** — dificulta testes e troca de projeto sem reload; aceitável para SPA.
5. **Watcher** fora do repo — documentação operacional fragmentada.
6. **`middleware` deprecado** no Next 16 — dívida de plataforma.
7. **Logs `[REALTIME]` e diagnósticos** — podem vazar estrutura de payload em produção.
8. **Exclusão de evento** assume paths R2/thumbnail/QR coerentes com uploader; divergências = lixo em bucket.
9. **Sem rate limit** nas APIs públicas de criação/exclusão.
10. **`compareUploadTokens`** exige buffers mesma length — tokens de tamanhos diferentes falham comparação (esperado) mas documentar para clientes do watcher.

---

## 12. ESTRUTURA DE PASTAS (resumida)

```
gallery/
├── app/
│   ├── (admin)/admin/page.tsx
│   ├── (public)/page.tsx
│   ├── (public)/evento/[slug]/page.tsx
│   ├── (public)/video/[id]/page.tsx
│   ├── (public)/videos/[slug]/page.tsx
│   ├── api/events/route.ts
│   ├── api/events/[eventId]/route.ts
│   ├── api/videos/[id]/route.ts
│   ├── api/watcher/validate/route.ts
│   ├── layout.tsx
│   └── data/videos.ts (legado/aux)
├── components/
│   ├── admin/
│   └── public/
├── data/                    # events.json, videos.json (runtime local)
├── docs/                    # este relatório
├── hooks/
├── lib/
│   ├── auth/types.ts
│   ├── media/
│   ├── r2/removal.ts
│   ├── supabase/
│   └── watcher/
├── public/                  # assets estáticos servidos
├── repositories/
├── services/
├── supabase/
│   ├── schema.sql
│   ├── README.md
│   └── MIGRATION_CHECKLIST.md
├── types/
├── utils/
├── middleware.ts
├── next.config.ts
└── package.json
```

---

## 13. VARIÁVEIS DE AMBIENTE

| Variável | Onde usar | Papel |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Chave anon (Realtime, client) |
| `SUPABASE_URL` | Server (opcional) | Espelho sem `NEXT_PUBLIC_` para runtime Node/Vercel |
| `SUPABASE_ANON_KEY` | Server (opcional) | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor** | Bypass RLS para writes/reads administrativos |
| `GALLERY_DUAL_WRITE_LEGACY_JSON` | Server | `1`/`true` espelha escrita em `data/*.json` |
| `NEXT_PUBLIC_SITE_URL` | Server/build | Base absoluta para QR/links (fallback `VERCEL_URL`) |
| `VERCEL_URL` | Vercel automático | Host da implantação (sem esquema; código prefixa `https://`) |
| `R2_ACCOUNT_ID` | Server | ID conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Server | Chave API R2 |
| `R2_SECRET_ACCESS_KEY` | Server | Segredo API R2 |
| `R2_BUCKET_NAME` | Server | Nome do bucket |
| `R2_REGION` | Server | Default `auto` |
| `R2_KEY_PREFIX` | Server | Prefixo de chaves (default `videos`) |
| `NEXT_TELEMETRY_DISABLED` | CI/Vercel (opcional) | `1` desliga telemetria Next nos logs |

**Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` nem segredos R2 no client.

---

## 14. ESTADO ATUAL EXATO E PRÓXIMO PASSO

**Estado hoje:** aplicação **funcional** como galeria pública + admin sem auth, com **Supabase opcional**, **Realtime** na galeria quando `NEXT_PUBLIC_*` estão corretos, **exclusões** orquestradas (JSON + R2 + `public/`), **validação de watcher** via API, **deploy** passando lint/build nas versões corrigidas do código.

**Próximo passo recomendado (prioridade):** **fechar o admin e introduzir autenticação mínima** (Fase 1), em paralelo a **endurecer RLS** no Supabase e definir se `events`/`media` terão **owner** explícito. Sem isso, o sistema não deve ser tratado como multi-tenant seguro.

---

*Documento gerado a partir da análise estática do repositório `gallery` (event-media-gallery). Ajustar datas e números de versão se o fork divergir.*
