# Fase 2.1E-1 — Landing de Espera para QR Instantâneo

**Data:** 2026-06-07  
**Repositório:** `event-media-gallery-1.0`  
**Escopo:** Gallery apenas — preparação para QR instantâneo do Booth (fase futura).

---

## 1. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/(public)/media/[id]/page.tsx` | Waiting screen em vez de 404 quando mídia não está pronta |
| `app/globals.css` | Animação `media-wait-indeterminate` |

## 2. Arquivos criados

| Arquivo | Função |
|---------|--------|
| `lib/media/media-public-status.ts` | Regras `exists` / `ready` / `reviewStatus` |
| `app/api/media/[id]/status/route.ts` | `GET` público de status |
| `components/public/media-waiting-page-client.tsx` | UI de espera + polling |
| `docs/FASE-2.1E-1-LANDING-ESPERA-REPORT.md` | Este relatório |

---

## 3. Endpoints criados

### `GET /api/media/{id}/status`

Respostas possíveis:

```json
{ "exists": false, "ready": false }
```

```json
{ "exists": true, "ready": false, "reviewStatus": "pending" }
```

```json
{
  "exists": true,
  "ready": true,
  "reviewStatus": "approved",
  "publicUrl": "/media/guest_xxxxxxxxxxxxxxxxxx"
}
```

### Regra `ready`

`ready === true` somente quando:

- registro existe em `media`
- não está soft-deleted (`deletedAt` vazio)
- `isHidden !== true`
- `reviewStatus === "approved"`

Implementação reutiliza `isMediaVisiblePublicly()` de `services/mediaService.ts`.

---

## 4. Fluxo final

```text
Convidado abre /media/{mediaId}
  ↓
SSR: getVideoById (só mídia pública aprovada)
  ↓
┌─ mídia pronta ─────────────────────────────┐
│  renderiza MediaViewerPageClient (inalterado) │
└──────────────────────────────────────────────┘
  ↓
┌─ mídia não pronta / inexistente ─────────────┐
│  getMediaPublicStatus()                       │
│  renderiza MediaWaitingPageClient             │
│  polling GET /api/media/{id}/status (2s)      │
│  quando ready === true → router.refresh()     │
│  SSR reexecuta → página normal da mídia      │
└──────────────────────────────────────────────┘
```

Cobre o intervalo **sign → mediaId criado → upload → complete** em que o registro ainda não existe (`exists: false`).

---

## 5. Estados da landing

| Estado | Condição API | Título | Subtexto |
|--------|--------------|--------|----------|
| **1 — Processando** | `exists: false` | Preparando sua mídia | Sua foto ou vídeo está sendo processado. Esta página atualizará automaticamente. |
| **2 — Moderação** | `exists: true`, `ready: false`, `reviewStatus: pending` | Aguardando aprovação | Sua mídia foi enviada com sucesso. Aguardando aprovação do organizador. |
| **3 — Pronta** | `ready: true` | — | `router.refresh()` → viewer normal |
| *(extra)* Rejeitada | `reviewStatus: rejected` | Mídia indisponível | Mensagem neutra (sem 404) |

**UI:** card central, `AmbientBackground`, spinner (`Loader2`), barra indeterminada animada.

---

## 6. Estratégia de polling

- Intervalo: **2 segundos**
- Endpoint: `GET /api/media/{id}/status` com `cache: "no-store"`
- Primeira renderização usa status do SSR (`initialStatus`) — sem flash desnecessário
- Ao detectar `ready: true` no cliente: `router.refresh()` (revalida RSC da página)
- Erros de rede no poll são ignorados silenciosamente (próximo ciclo tenta de novo)

---

## 7. Compatibilidade garantida

**Não alterado:**

| Área | Status |
|------|--------|
| `guest-upload/sign` | Inalterado |
| `guest-upload/complete` | Inalterado |
| Geração QR PNG (`lib/media/qr-code.ts`) | Inalterado |
| `routes.media` / `routes.video` | Inalterado |
| Redirect `/video` → `/media` | Inalterado |
| Booth | Inalterado |
| Watcher | Inalterado |
| Novas tabelas (`booth_sessions`, etc.) | Não criadas |

**Mídia já aprovada:** fluxo idêntico ao anterior — `getVideoById` encontra registro e renderiza viewer sem waiting screen.

**Metadata:** título `"Preparando sua mídia"` quando mídia ainda não está pronta (em vez de 404 no `<title>`).

---

## 8. Build status

```text
npm run build
✓ Compiled successfully
✓ TypeScript OK
Route: ƒ /api/media/[id]/status
Route: ƒ /media/[id]
Exit code: 0
```

---

## 9. Próximo passo (fora desta fase)

Fase Booth **2.1E-2+**: antecipar `sign` após captura e exibir QR com `/media/{mediaId}` antes do `complete`. A Gallery já suporta a landing de espera para convidados que escanearem cedo.
