# TalkFree

A real-time messaging web app with voice and video calls, built with React, TypeScript and Supabase. Installable as a PWA.

## Features

- **Auth and profiles** — email sign-in, user search, settings page
- **Direct chat and group channels** — real-time messages, emoji picker, message bubbles
- **Polls** — create and vote inside a conversation
- **Voice messages** — record and send audio
- **Calls** — incoming-call dialog, active-call overlay, call quality indicator, call history
- **Status** — post and view short-lived statuses
- **AI assistant** — chat with an LLM through a Supabase Edge Function (`supabase/functions/ai-chat`)

## Stack

| Layer | Tech |
|---|---|
| UI | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| State / data | TanStack Query, Supabase client |
| Backend | Supabase (Postgres + RLS migrations in `supabase/migrations`, Edge Functions) |
| Tooling | ESLint, Vitest, Playwright, vite-plugin-pwa |

## Getting started

```bash
npm install
cp .env.example .env     # then fill in your Supabase project values
npm run dev              # http://localhost:8080 (see vite.config.ts)
```

Other scripts: `npm run build`, `npm run lint`, `npm test`.

### Backend setup

1. Create a Supabase project and put its URL and anon (publishable) key in `.env`.
2. Apply the SQL files in `supabase/migrations/` in order (or use the Supabase CLI: `supabase db push`).
3. Deploy the AI function and set its secret:
   ```bash
   supabase functions deploy ai-chat
   supabase secrets set LOVABLE_API_KEY=your-key
   ```
   The function calls an OpenAI-compatible chat completions gateway; point it at your own provider if you prefer.

## Project layout

```
src/
  components/{chat,channels,call,status,ui}/
  pages/            Auth, Index, Settings, NotFound
supabase/
  migrations/       database schema and policies
  functions/ai-chat Edge Function for the AI assistant
```

## Notes

Only the Supabase **anon** key belongs in the frontend `.env`. Never commit service-role keys or `LOVABLE_API_KEY`.
