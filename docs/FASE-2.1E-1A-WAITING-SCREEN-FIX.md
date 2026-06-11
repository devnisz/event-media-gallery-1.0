# Fase 2.1E-1A — Correção da Landing de Espera `/media/{id}`

**Data:** 2026-06-07  
**Repositório:** `event-media-gallery-1.0`

---

## 1. Problema observado

Ao acessar `/media/{mediaId}` **antes do `complete`**, a Gallery exibia:

```text
404 — This page could not be found.
```

Em vez da Waiting Screen da Fase 2.1E-1.

---

## 2. Causa raiz (auditoria)

### 2.1 `notFound()` ainda presente em `page.tsx`

Na implementação 2.1E-1, `app/(public)/media/[id]/page.tsx` ainda chamava `notFound()` em dois cenários:

| Linha (antes) | Condição | Efeito |
|---------------|----------|--------|
| ~61 | `!video` **e** `initialStatus.ready === true` | 404 |
| ~85 | `video` existe mas `!event` | 404 |

Para mídia **inexistente** (`exists: false`), o fluxo correto da 2.1E-1 deveria mostrar waiting — e em teoria funcionava.

Porém:

1. **`initialStatus.ready && !video`** podia ocorrer em condição de corrida / inconsistência entre leituras → **404 indevido**.
2. **`!event` após `video` encontrado** → **404** mesmo com mídia válida em sincronização.
3. **`loading.tsx`** usava `VideoPageLoadingShell` (skeleton de viewer), não a waiting screen — experiência inconsistente durante SSR.
4. **Produção** pode ter estado com build anterior à 2.1E-1 (página antiga com `if (!video) notFound()` direto).

### 2.2 O que NÃO era o problema

| Item | Status |
|------|--------|
| `GET /api/media/{id}/status` | Funcional |
| `MediaWaitingPageClient` / polling 2s | Implementado |
| `getMediaPublicStatus` | Correto (`exists: false` antes do complete) |
| Middleware | Não bloqueia `/media/*` |
| Redirect `/video` → `/media` | OK |

---

## 3. Correção aplicada

### 3.1 Roteamento unificado — `resolveMediaPageRenderMode`

**Arquivo novo:** `lib/media/resolve-media-page.ts`

```text
getVideoById + evento
  → mode: "viewer"

caso contrário
  → getMediaPublicStatus
  → retry se ready (sync)
  → mode: "waiting"   ← NUNCA notFound()
```

### 3.2 `page.tsx` — remoção total de `notFound()`

- Import de `notFound` removido.
- Toda mídia não pronta → `MediaWaitingPageClient`.
- Viewer só quando vídeo **e** evento confirmados.

### 3.3 `loading.tsx`

- Passa a usar a **mesma Waiting Screen** (visual MidiaUp).
- `pollEnabled={false}` até o `mediaId` estar disponível no SSR.

### 3.4 Polling

- Primeira consulta **imediata** ao montar + intervalo 2s.
- `router.refresh()` quando `ready === true`.

---

## 4. Melhoria visual (Waiting Screen)

**Arquivo:** `components/public/media-waiting-page-client.tsx`

- Fundo escuro com gradiente radial (paleta MidiaUp)
- Logo **MidiaUp** (badge `M` + wordmark)
- Emoji contextual (📸 / ⏳ / 🔒)
- Título: *"Sua mídia está sendo preparada"*
- Subtexto amigável
- Spinner duplo (anel animado + barra indeterminada)
- Card com glassmorphism (`backdrop-blur`, borda suave)

---

## 5. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/(public)/media/[id]/page.tsx` | Sem `notFound()`; usa `resolveMediaPageRenderMode` |
| `app/(public)/media/[id]/loading.tsx` | Waiting screen em vez de viewer skeleton |
| `components/public/media-waiting-page-client.tsx` | Visual MidiaUp + poll imediato |
| `lib/media/resolve-media-page.ts` | **Novo** — decisão viewer vs waiting |

## 6. Arquivos criados

| Arquivo | Função |
|---------|--------|
| `docs/FASE-2.1E-1A-WAITING-SCREEN-FIX.md` | Este relatório |

**Inalterados:** guest-upload, status API, `media-public-status.ts`, Booth.

---

## 7. Estados visuais (após correção)

| Estado API | Título |
|------------|--------|
| `exists: false` | 📸 Sua mídia está sendo preparada |
| `exists: true`, `pending` | ⏳ Aguardando aprovação |
| `exists: true`, `rejected` | 🔒 Mídia indisponível |
| `ready: true` | `router.refresh()` → viewer normal |

**Nunca** 404 para mídia aguardando upload/complete.

---

## 8. Build status

```text
npm run build
✓ Compiled successfully
✓ TypeScript OK
Exit code: 0
```

---

## 9. Veredito

A landing de espera estava implementada na 2.1E-1, mas **`notFound()` residual** e roteamento fragmentado permitiam 404 em cenários reais. A correção centraliza a decisão em `resolveMediaPageRenderMode` e **elimina 404** para mídia não pronta, com UI alinhada à identidade MidiaUp.

**Deploy necessário** em produção (`www.midiaup.app`) para refletir a correção.
