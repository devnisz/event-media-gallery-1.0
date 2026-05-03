# Supabase — galeria (events + media)

## Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + servidor | URL do projeto (Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente + servidor | Chave anon pública. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor** (ex.: Vercel env secreta) | Recomendada para writes nas Route Handlers sem depender de RLS permissiva. **Nunca** expor no browser. |
| `GALLERY_DUAL_WRITE_LEGACY_JSON` | Opcional | `true` ou `1` para espelhar escrita em `data/events.json` e `data/videos.json` além do Supabase (transição). |

## Setup rápido

1. Crie um projeto em [Supabase](https://supabase.com).
2. No **SQL Editor**, cole e execute o arquivo `schema.sql` desta pasta.
3. Copie **Project URL** e **anon public** em Settings → API.
4. No app Next.js, crie ou editee `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

5. Na Vercel: Project Settings → Environment Variables — mesmas chaves para Production (e Preview se desejar).

6. Reinicie `npm run dev`.

## Logs

- `[SUPABASE]` — configuração / avisos do cliente.
- `[REPOSITORY]` — leitura/escrita bem-sucedida.
- `[MIGRATION]` — fallback JSON, dual-write ou falhas.

## Notas

- Leituras com falha no Supabase caem automaticamente em `data/*.json` se existirem.
- Colunas extras vs. pedido inicial: `cover_image`, `videos_count` nos events; `event_slug`, `name`, `uploaded_at`, `legacy_timestamp` em media alinham `GalleryEventRecord` / `GalleryMediaRecord`.
