# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dayforma is a single-user-scoped AI-powered interactive calendar + todo web app built for CSC 710
(Software Engineering) final project. Left panel: multi-view calendar (Month / Week / Day / Agenda).
Right panel: todo list. A Claude-powered assistant — invoked via a Supabase Edge Function — parses
natural-language todos, auto-schedules them into free time, infers priority/category, summarizes the
week, and accepts voice commands through the Web Speech API.

The full design spec lives in `CSC710_Dayforma_Technical_Document.md` at the repo root. It covers the
database schema + RLS policies (Section 6), the Claude tool-use protocol (Section 10), the realtime
channel architecture (Section 11), the component tree (Section 12), type definitions (Section 13.2),
and the planned file structure (Section 12.3).

## Commands

```bash
npm install              # install dependencies
npm run dev              # start Vite dev server → http://localhost:5173/CSC-710-AI-Calendar/
npm run build            # tsc -b && vite build → outputs to dist/
npm run preview          # preview production build locally
npm run typecheck        # tsc --noEmit
npm run test             # vitest watch
npm run test:run         # vitest run (CI)
```

Supabase:
```bash
supabase link --project-ref <ref>      # link local checkout to the Dayforma project
supabase db push                        # apply migrations in supabase/migrations
supabase functions deploy ai-assistant  # deploy the Edge Function
supabase functions serve ai-assistant   # run it locally for dev
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

Edge Function runtime (set via `supabase secrets set`):

```
ANTHROPIC_API_KEY=<claude api key>
```

GitHub Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The Anthropic key is
never exposed to the browser — only the Edge Function sees it.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Router:** React Router v7
- **Calendar:** FullCalendar v6 (`@fullcalendar/react` + daygrid, timegrid, list, interaction)
- **Forms:** react-hook-form + zod (zod schemas shared with the Edge Function)
- **Toast:** sonner
- **State:** React Context + useReducer (one context per domain: Auth, Events, Todos, Theme)
- **Date:** date-fns v4; browser timezone, UTC in DB
- **Icons:** lucide-react
- **Backend:** Supabase (Auth, Postgres, Realtime, Edge Functions)
- **AI:** Claude API (`claude-sonnet-4-6`) called **only** from the Supabase Edge Function
- **Voice:** Web Speech API (`SpeechRecognition` + `SpeechSynthesis`) — Chrome/Edge only; warning banner in other browsers
- **Hosting:** GitHub Pages, auto-deployed on push to `main` (`.github/workflows/deploy-pages.yml`)

### Source structure (actual as of Sprint 3 close, 2026-05-13)

```
src/
├── lib/              # supabase client, applyWithUndo, imageUpload, nlDetect,
│                     # priorityInference, rruleHelpers, schemas/, themeUtils
├── contexts/         # AuthContext, EventContext, TodoContext, ThemeContext
├── hooks/            # useAuth, useEvents, useTodos, useCategories, useHolidays,
│                     # useAIAssistant, useVoice, useTheme
├── pages/            # LandingPage, LoginPage, DashboardPage, SettingsPage
├── components/
│   ├── common/       # Modal, ProtectedRoute, ThemeToggle, BrowserSupportBanner
│   ├── calendar/     # CalendarView, EventModal, EventForm, HolidayModal
│   ├── ai/           # AIAssistant, VoiceButton, ConversationBubble
│   └── settings/     # CategoryManager
├── types/            # TypeScript interfaces (index.ts)
└── styles/           # index.css (Tailwind imports)
```

Note: Sprint 3 kept todo + dashboard layout inline in `pages/DashboardPage.tsx` rather than
breaking them into a `components/dashboard/` subtree as originally planned. Splitting is
deferred to Phase 4 polish.

```
supabase/
├── config.toml
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_todo_attachments.sql      # adds todos.image_url + todo-attachments bucket
│   └── 003_todos_realtime.sql        # restores todos in supabase_realtime publication
└── functions/
    ├── ai-assistant/
    │   ├── index.ts        # Deno + Claude SDK, agentic tool loop
    │   ├── tools.ts        # Zod schemas + JSON Schema mirrors for 7 tools
    │   └── toolHandlers.ts # tool→DB mutation resolvers
    └── infer-todo/
        └── index.ts        # cheap priority/category inference for plain todos
```

### Key routes

| Route           | Page             | Auth Required |
| --------------- | ---------------- | ------------- |
| `/`             | Landing          | No            |
| `/login`        | Login / Register | No            |
| `/dashboard`    | Dashboard        | Yes           |
| `/settings`     | Settings         | Yes           |

Only `/` is public; every other route is wrapped in `ProtectedRoute` and redirects to `/login` when
unauthenticated.

## Database

PostgreSQL schema is defined in `supabase/migrations/001_initial_schema.sql`. Key tables:

- `profiles` — extends `auth.users`, created on signup via the `handle_new_user` trigger; holds
  `display_name`, `timezone`, `theme_preference`
- `categories` — per-user categories with colour; `Work`, `Personal`, `Health` seeded by the
  signup trigger
- `events` — calendar events: `start_at`, `end_at`, `all_day`, `category_id`, optional
  `rrule` JSONB for simple recurrence, `created_by_ai` flag
- `todos` — tasks: `due_at`, `priority`, `status` (`pending` / `scheduled` / `done`),
  `linked_event_id` (1-to-1 link to `events`)
- `ai_conversations` — per-session conversation history (messages JSONB) so Claude has context
  across turns
- `ai_parse_logs` — every NL parse for debugging and future fine-tuning (`input_text`,
  `parsed_output`, `accepted`)

**Row-Level Security is mandatory** on every user-scoped table: every policy compares `user_id =
auth.uid()`. Do not write queries that bypass RLS.

Realtime is enabled on `events` and `todos` so multi-device sync works.

## AI Integration

The Edge Function at `supabase/functions/ai-assistant/index.ts`:
1. Verifies the caller's Supabase JWT.
2. Loads the user's conversation from `ai_conversations`.
3. Calls Claude (`claude-sonnet-4-6`) with a cached system prompt + tool definitions.
4. Resolves tool calls (`create_event`, `update_event`, `delete_event`, `create_todo`,
   `find_free_time`, `list_events`, `summarize_week`) by reading/writing the database on the
   user's behalf.
5. Appends the response to the conversation and returns it to the client.

AI autonomy is **semi-autonomous**: the assistant acts directly when confident and surfaces a
30-second Sonner Undo toast for every mutating action. When ambiguous, it asks before acting.

### Prompt caching

The system prompt + tool definitions are stable and carry a `cache_control: { type: "ephemeral" }`
breakpoint. Only the conversation messages vary per call, keeping cache-hit rates high.

## Testing

- Unit + integration: `vitest` + `@testing-library/react`
- E2E: Playwright MCP or Chrome-in-Claude for manual test runs
- Test helpers live in `tests/`

## Conventions

- **Components:** PascalCase filenames (`TodoPanel.tsx`)
- **Hooks:** camelCase with `use` prefix (`useAIAssistant.ts`)
- **Types:** PascalCase (`Event`, `Todo`, `Category`)
- **DB tables/columns:** snake_case (`linked_event_id`, `created_by_ai`)
- **Constants:** UPPER_SNAKE_CASE (`UNDO_TIMEOUT_MS`)
- **Branches:** kebab-case (`feature/ai-assistant`)
- **Commits:** Conventional Commits (`feat: add voice button`)
- **CSS:** Tailwind utility classes; dark default + light toggle via `prefers-color-scheme`

## Deployment

Vite `base` is `/CSC-710-AI-Calendar/`. All asset paths and router base must respect this prefix.
GitHub Pages deploy runs automatically on push to `main`. `public/404.html` contains the SPA
redirect stub.

## Security Notes

- Dayforma is multi-user, so **RLS is mandatory** (unlike the Battleship academic project).
- The Claude API key lives only in the Edge Function env (`supabase secrets set`). The frontend
  never sees it.
- Supabase anon key in the browser is intentional (that's how Supabase works); RLS is the defence.
- Edge Function verifies the Supabase JWT on every request before reading/writing user data.
