# Guia de logs — `[WATCHER_CREATE_EVENT]` (POST `/api/watcher/events`)

**Arquivo instrumentado:** `app/api/watcher/events/route.ts`  
**Escopo:** diagnóstico temporário — sem alteração de regra de negócio.

---

## Sequência esperada (sucesso)

```text
[WATCHER_CREATE_EVENT][START]
[WATCHER_CREATE_EVENT][BODY]
[WATCHER_CREATE_EVENT][USER]
[WATCHER_CREATE_EVENT][BEFORE_CREATE]
[WATCHER_CREATE_EVENT][AFTER_CREATE]
[WATCHER_CREATE_EVENT][BEFORE_REVALIDATE]
[WATCHER_CREATE_EVENT][AFTER_REVALIDATE]  path: /
[WATCHER_CREATE_EVENT][AFTER_REVALIDATE]  path: /dashboard
[WATCHER_CREATE_EVENT][AFTER_REVALIDATE]  path: /evento/{slug}
→ HTTP 200 { success: true, event: … }
```

---

## O que cada log registra

| Tag | Conteúdo |
|-----|----------|
| `[START]` | Timestamp ISO do início do handler |
| `[BODY]` | `body` bruto, `name` após trim, `nameLength` |
| `[USER]` | `ownerUserId`, `ownerUserIdTail`, `email` |
| `[BEFORE_CREATE]` | `name`, `ownerUserId`, `options` passados à persistência |
| `[AFTER_CREATE]` | **`event` completo** + objeto **`persistence`** (`branch`, `repositoryLabel`, `supabaseError`, …) |
| `[BEFORE_REVALIDATE]` | Lista de paths + `eventId` / `slug` |
| `[AFTER_REVALIDATE]` | Cada path após `revalidatePath(path)` sem exceção (`ok: true`) |
| `[ERROR]` | `message`, `stack`, `error`, `serialized` |

---

## Como responder às 5 perguntas (após reproduzir falha no Booth)

### 1. Último log executado antes da falha

| Último log visível | Falha provável em |
|--------------------|-------------------|
| `[USER]` ou anterior | Auth (improvável — seria 401, não 500) ou body vazio (400) |
| `[BEFORE_CREATE]` | **`createEventRecordWithPersistence`** (read/upsert Supabase) |
| `[AFTER_CREATE]` | **`revalidatePath`** (primeiro path que não gerou `[AFTER_REVALIDATE]`) |
| `[BEFORE_REVALIDATE]` | **`revalidatePath("/")`** |
| Um `[AFTER_REVALIDATE]` path `/` | **`revalidatePath("/dashboard")`** |
| `[AFTER_REVALIDATE]` `/dashboard` | **`revalidatePath("/evento/{slug}")`** |
| Todos `[AFTER_REVALIDATE]` | Falha **não** neste handler (improvável se cliente viu 500) |

### 2. `createEventRecordWithPersistence` retornou sucesso?

- **Sim** se existir log `[AFTER_CREATE]` com `event.id` e `persistence.branch`.
- **Não** se último log for `[BEFORE_CREATE]` e em seguida `[ERROR]` (sem `[AFTER_CREATE]`).

### 3. O evento foi persistido?

Interpretar `persistence` em `[AFTER_CREATE]`:

| `persistence.branch` | Persistido? |
|----------------------|-------------|
| `supabase_success` | Sim — Supabase |
| `supabase_success_dual_json` | Sim — Supabase + JSON espelho |
| `supabase_failed_json_fallback` | Sim — fallback JSON (`usedFallbackJson: true`) |
| `json_not_configured` / `json_no_client` | Sim — só JSON local (dev) |

Se `[AFTER_CREATE]` **não apareceu**, persistência **não completou** (exceção dentro da função).

**Nota:** se `[AFTER_CREATE]` aparece mas Booth recebe 500, o evento **pode** estar gravado e a falha é **pós-persistência** (`revalidatePath`). Confirmar com GET `/api/watcher/events` ou dashboard.

### 4. Algum `revalidatePath` lançou exceção?

- **Sim** se há `[BEFORE_REVALIDATE]` mas **faltam** um ou mais `[AFTER_REVALIDATE]` esperados (3 no total).
- O path que **não** tem `[AFTER_REVALIDATE]` seguinte é o candidato à exceção.
- **Não** se os três `[AFTER_REVALIDATE]` aparecem com `ok: true`.

`revalidatePath` no Next.js não retorna valor — sucesso = log `[AFTER_REVALIDATE]`; falha = exceção → `[ERROR]`.

### 5. Mensagem exata do erro

Fontes (em ordem):

1. `[WATCHER_CREATE_EVENT][ERROR].message`
2. `[WATCHER_CREATE_EVENT][ERROR].stack`
3. Resposta HTTP ao Booth: `errorDetail` + `errorStack`
4. `[WATCHER_EVENTS] erro ao criar evento` (legado)

---

## Cenários típicos

### Cenário A — Falha na persistência (igual hipótese Supabase)

```text
[BEFORE_CREATE]
[ERROR]  message: "Falha ao persistir eventos no Supabase …"
```

- Último log antes da falha: **`[BEFORE_CREATE]`**
- `createEventRecordWithPersistence`: **não retornou**
- Evento persistido: **não**
- `revalidatePath`: **não executado**

### Cenário B — Persistência OK, `revalidatePath` falha

```text
[AFTER_CREATE]  persistence.branch: supabase_success
[BEFORE_REVALIDATE]
[AFTER_REVALIDATE] path: /
[ERROR]  message: …
```

- Último log: **`[AFTER_REVALIDATE] path: /`** (falha no próximo `revalidatePath`)
- `createEventRecordWithPersistence`: **sucesso**
- Evento persistido: **provavelmente sim** — verificar listagem
- `revalidatePath`: **sim, exceção** em `/dashboard` ou `/evento/…`

### Cenário C — Sucesso completo (referência)

Todos os logs até 3× `[AFTER_REVALIDATE]` → Booth deve receber 200.

---

## Coleta (Vercel)

1. Deploy da Gallery com este arquivo.
2. Booth → Studio → Criar evento → falhar.
3. Vercel → Project → Logs → filtrar `WATCHER_CREATE_EVENT`.
4. Copiar sequência completa de tags + `[ERROR]` se houver.
5. Comparar `ownerUserIdTail` com log `[EVENT_CREATE]` do dashboard no mesmo horário.

---

## Estado atual desta investigação (pré-deploy)

Sem logs de produção capturados nesta sessão, as respostas 1–5 são **determinadas pelo operador** após deploy usando a tabela acima.

**Código (estático):** dashboard e watcher chamam a **mesma** `createEventRecordWithPersistence(name, { ownerUserId })`. Divergência observável em runtime só via sequência `[WATCHER_CREATE_EVENT]*` vs falha no Booth.

---

## Remoção pós-diagnóstico

Remover todos os `console.info/error` com prefixo `[WATCHER_CREATE_EVENT]` e restaurar resposta 500 sem `errorStack` se desejado.
