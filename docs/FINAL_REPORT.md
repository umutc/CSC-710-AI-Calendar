# Dayforma — AI-Powered Interactive Calendar

**Final Report — CSC 710 Software Engineering, Spring 2026**

| Field | Value |
| --- | --- |
| Team | Umut Çelik · Merve Gazi · Justin Huang |
| Course | CSC 710 — Software Engineering |
| Institution | CUNY College of Staten Island |
| Submission | 2026-05-20 |
| Live demo | <https://umutc.github.io/CSC-710-AI-Calendar/> |
| Repository | <https://github.com/umutc/CSC-710-AI-Calendar> |
| Technical Design | [`CSC710_Dayforma_Technical_Document.md`](../CSC710_Dayforma_Technical_Document.md) |

---

## 1. Abstract

Dayforma is an AI-powered interactive calendar and todo manager built for the CSC 710 Software
Engineering final project. The application combines a multi-view FullCalendar surface with a
right-rail todo panel and a Claude-backed assistant that parses natural-language input, schedules
events into free time, infers priority and category, summarises the week, and accepts image
attachments — including photos of handwritten notes — that the AI converts into structured todos
and events. All AI mutations are reversible through a 30-second Sonner Undo toast. The system is
deployed continuously to GitHub Pages from `main`, backed by Supabase Auth, Postgres with
row-level security, Realtime, Storage, and a Deno Edge Function that brokers calls to Claude
Sonnet 4.6. The team closed all Sprint 0–3 stories on schedule, shipped one course-specific
feature (image attachment) requested mid-development by the instructor, and produced a working
public deployment with 84 unit tests passing on the final branch.

---

## 2. Introduction

### 2.1 Background

Modern productivity tools split the user's attention across two surfaces: a calendar and a todo
list. Calendars are good at time but bad at intent; todo lists are good at intent but bad at
time. AI assistants exist alongside these tools, but typically propose actions ("you could
schedule this at 3 PM") rather than acting directly on the user's schedule. Dayforma was
designed to test how far an AI assistant can be trusted to act for a single user — creating,
moving, and deleting events and todos directly — while staying recoverable through cheap
client-side undo.

### 2.2 Problem Statement

Build a single-user productivity tool that:
1. Treats calendar events and todos as first-class peers in one workspace.
2. Lets the user type, drag, speak, **or attach an image** to schedule work.
3. Uses an AI agent that **acts** rather than suggests, while keeping every mutation undoable.
4. Stays inside a student-grade hosting + cost budget (GitHub Pages, Supabase free tier,
   Anthropic on-demand).

### 2.3 Scope

v1 ships the features enumerated in §1.2 of the Technical Design Document: authentication
backed by Supabase Auth; CRUD over events and todos with realtime sync; FullCalendar Month/
Week/Day/Agenda views; recurrence presets; per-user categories with a colour picker; the
Claude assistant with seven tools (`create_event`, `update_event`, `delete_event`,
`create_todo`, `find_free_time`, `list_events`, `summarize_week`); voice in/out via the Web
Speech API; image attachment via file picker or live camera capture; Claude vision OCR of
handwritten notes via the chat panel; theming; and a 30-second undo toast on every AI action.

### 2.4 Limitations

- Academic-grade availability (single small Supabase project, no SLA).
- English-only assistant; Web Speech API recognition limited to `en-US`.
- Voice features require Chrome or Edge.
- v1 is single-user-scoped — sharing, collaboration, and cross-user features are explicitly out.
- Mobile responsive layout was scoped out of Sprint 3 and deferred to Phase 4 polish.

---

## 3. Requirements Analysis

### 3.1 Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-1 | User can sign up, sign in, and sign out via email + password. |
| FR-2 | User sees a dashboard with a left-side calendar and right-side todo panel. |
| FR-3 | Calendar supports Month, Week, Day, and Agenda views with a persisted preference. |
| FR-4 | Events can be created, updated, and deleted via a modal or via drag-drop from todos. |
| FR-5 | Events support daily, weekday, weekly, biweekly, and monthly recurrence presets. |
| FR-6 | Todos can be created, edited inline, toggled, and deleted. |
| FR-7 | Categories are per-user, colour-picked, and reflected on every event and todo badge. |
| FR-8 | An AI assistant parses natural-language input and acts on the calendar / todo list. |
| FR-9 | Every AI mutation surfaces a 30-second undo toast. |
| FR-10 | Voice input transcribes speech to the AI; AI replies are spoken back via TTS. |
| FR-11 | Users can attach an image to a todo (file picker or live camera capture). |
| FR-12 | The AI accepts an image and uses Claude vision to extract todos / events. |
| FR-13 | The AI can summarise the current week as markdown. |
| FR-14 | The AI can locate free time slots that meet a duration and time-window query. |
| FR-15 | US public holidays render on the calendar with a clickable info modal. |
| FR-16 | Theme follows `prefers-color-scheme` with a manual toggle persisted to the profile. |

### 3.2 Non-Functional Requirements

- **Security.** Row-level security is mandatory on every user-scoped table; the Anthropic
  API key never leaves the Edge Function environment; the browser only sees the Supabase
  publishable key.
- **Latency.** Direct calls to Supabase Postgres are sub-200 ms locally; Claude calls land in
  3–7 seconds for vision and 1–3 seconds for text.
- **Reversibility.** Every AI-driven write must be undoable within 30 seconds.
- **Accessibility.** The dashboard supports keyboard navigation; ARIA labels are present on
  every actionable icon button; the assistant uses an `aria-live` region for the voice
  interim transcript.
- **Deployment.** A push to `main` builds and deploys to GitHub Pages automatically.

### 3.3 User Stories

1. *As a user,* I can sign up and log in so that my data stays private.
2. *As a user,* I can type "lunch with mom next Tuesday at noon" and have the assistant
   create the event for me.
3. *As a user,* I can drag a todo onto the calendar to schedule it; if I hold Shift the AI
   stays out of it.
4. *As a user,* I can hold a mic button and dictate "summarise my week."
5. *As a user,* I can take a photo of a paper handwritten note; the assistant reads it and
   creates the corresponding todos and events.
6. *As a user,* I can attach a photo to a specific todo as a visual reference.
7. *As a user,* I can undo any AI action within 30 seconds.
8. *As a user,* I can ask the AI to find a 45-minute slot tomorrow afternoon.
9. *As a user,* I can switch between Month, Week, Day, and Agenda views.
10. *As a user,* I can manage categories and see events recoloured immediately.

---

## 4. System Design

### 4.1 Overall Architecture

The system is a single-page React 18 application built with Vite 6, served as a static site
from GitHub Pages. Authentication, persistence, realtime, file storage, and the AI brokerage
all live in a single Supabase project. The browser holds an anonymous Supabase publishable
key; row-level security policies are the access boundary. The Anthropic API key lives
exclusively in the Supabase Edge Function environment; the browser never sees it.

```
Browser (React + Vite + Tailwind)
   │
   │  ▲ supabase-js (anon key + user JWT)
   ▼
Supabase (Postgres + Auth + Realtime + Storage)
   │
   │  ▲ Edge Function (Deno + Claude SDK)
   ▼
Anthropic API (claude-sonnet-4-6)
```

### 4.2 Database Schema

Six tables in the `public` schema, all RLS-gated by `auth.uid() = user_id`:

| Table | Purpose |
| --- | --- |
| `profiles` | Extends `auth.users`; created by the `handle_new_user` trigger; carries `display_name`, `timezone`, `theme_preference`. |
| `categories` | Per-user labels with a hex colour. `Work`, `Personal`, `Health` are seeded by the trigger. |
| `events` | Calendar entries with `start_at`, `end_at`, `all_day`, `category_id`, optional `rrule` JSONB, `created_by_ai` flag. |
| `todos` | Tasks with `due_at`, `priority`, `status`, `linked_event_id`, `created_by_ai`, and `image_url` (added in `002_todo_attachments`). |
| `ai_conversations` | Per-session conversation history (JSONB messages) so Claude can keep context across turns. |
| `ai_parse_logs` | Audit trail of NL parses for debugging and future fine-tuning. |

A second migration adds a `todo-attachments` Supabase Storage bucket with owner-only write and
public read, gated by the `auth.uid()/<filename>` path convention.

### 4.3 Component Architecture

Routing is React Router v7. Three public-or-protected routes are mounted:

| Route | Page | Protected? |
| --- | --- | --- |
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/settings` | SettingsPage | Yes |

State is managed through React Context + `useReducer`, one provider per domain (Auth, Events,
Todos, Theme). Per-row optimistic updates are reconciled by realtime channel events on the
`events` and `todos` tables.

### 4.4 Data Flows

The natural-language flow is the canonical AI path:

1. The user types a sentence in the todo quick-add input.
2. `looksLikeNL` (a small regex over temporal nouns and event nouns) decides whether to route
   to the AI panel.
3. The AI panel calls the Edge Function with the raw text, the user's JWT, and the timezone.
4. The Edge Function loads recent conversation messages, attaches the cached system prompt,
   and starts an agentic loop with the seven tool definitions.
5. Claude returns either a final assistant message or a tool-use block; the loop executes
   the tool, persists the mutation, and feeds the result back to Claude.
6. The Edge Function returns the final text and a list of mutations.
7. The client renders the assistant reply (markdown via `react-markdown` + `remark-gfm`)
   and fires a 30-second Sonner Undo toast for each mutation.

The vision flow is a superset: the user attaches an image, which uploads to the storage
bucket; the resulting public URL becomes the `image_url` field on the request; the Edge
Function adds it as a Claude vision content block on the user message. Claude OCRs the
handwriting and calls the same tools to materialise structured records.

---

## 5. Implementation

### 5.1 Technology Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, Vite 6, TypeScript 5.8, Tailwind v4 |
| Routing | React Router v7 |
| Calendar UI | FullCalendar v6 (daygrid, timegrid, list, interaction) |
| Forms | `react-hook-form` + `zod` |
| State | React Context + `useReducer` |
| Dates | `date-fns` v4 |
| Toasts | `sonner` |
| Markdown | `react-markdown` + `remark-gfm` |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| AI | Claude Sonnet 4.6 via the Anthropic SDK in a Deno Edge Function |
| Voice | Web Speech API (`SpeechRecognition` + `SpeechSynthesis`) |
| Testing | Vitest + React Testing Library; manual E2E via Chrome-in-Claude |
| Hosting | GitHub Pages (auto-deploy on push to `main`) |

### 5.2 Module-to-Feature Mapping

The repository tree mirrors the system seams:

```
src/
├── contexts/         # AuthContext, EventContext, TodoContext, ThemeContext
├── hooks/            # useAuth, useEvents, useTodos, useCategories,
│                     # useHolidays, useAIAssistant, useVoice, useTheme
├── lib/              # supabase client, applyWithUndo, imageUpload,
│                     # nlDetect, priorityInference, rruleHelpers, schemas/
├── pages/            # LandingPage, LoginPage, DashboardPage, SettingsPage
├── components/
│   ├── ai/           # AIAssistant, ConversationBubble, VoiceButton
│   ├── calendar/     # CalendarView, EventModal, EventForm, HolidayModal
│   ├── common/       # Modal, ProtectedRoute, ThemeToggle
│   └── settings/     # CategoryManager
└── types/            # shared TypeScript interfaces
```

The Edge Function lives in `supabase/functions/ai-assistant/`:
- `index.ts` orchestrates JWT verify, history load, the agentic loop, conversation persist.
- `tools.ts` declares JSON Schemas + Zod mirrors for the seven tools.
- `toolHandlers.ts` resolves each tool call to a Postgres mutation and returns a mutation
  record so the client can wire its undo callback.

### 5.3 Key Algorithms

**`find_free_time`** (`toolHandlers.ts`). Fetches all events in the requested day window,
walks a cursor through them, and emits any gap of at least the requested duration.

**`rrule-helpers.expand`** (`src/lib/rruleHelpers.ts`). Given a base event and a visible
calendar range, produces concrete instances for the daily, weekday, weekly, biweekly, and
monthly presets without instantiating a heavyweight RFC-5545 dependency.

**Undo toast** (`src/lib/applyWithUndo.ts`). When the Edge Function returns a mutation
record, the client renders a Sonner toast whose `Undo` action invokes the inverse mutation
(delete for create, restore-from-snapshot for delete/update). The toast holds 30 seconds; on
expiry the action becomes permanent.

**Keyword priority inference** (`src/lib/priorityInference.ts`). Three case-insensitive,
whole-word regexes map *asap / urgent / critical / emergency / right now* → urgent;
*important / priority / must* → high; *someday / eventually / whenever / maybe / sometime* →
low. The helper returns `null` when nothing matches, so the default Medium remains untouched;
the heuristic only kicks in when the user did not pick a priority explicitly.

### 5.4 Challenges and Resolutions

| Challenge | Resolution |
| --- | --- |
| Vite + Vitest version alignment broke the test runner mid-Sprint 1. | Pinned `vitest` to a version matching the Vite major and re-locked. |
| FullCalendar drag-drop required external draggables to carry custom `data-event`. | Wrapped the todo row in a `data-event` JSON attribute and used the `Draggable` constructor from `@fullcalendar/interaction`. |
| Claude tool-call loop occasionally tried to recurse past intended depth. | Capped iterations at five and broke on the first non-tool stop reason. |
| Anthropic prompt cache hits required a stable system prompt. | Moved the system block into a separate `cache_control: { type: "ephemeral" }` block; only the conversation messages vary per call. |
| AI vision flow needed a public bucket without leaking write access. | Set the bucket public-read and gated INSERT/UPDATE/DELETE with the `auth.uid()/<path>` RLS policies. |
| The "looks like NL" heuristic occasionally hijacked the manual Add button. | Filed as a known follow-up; manual click still works in every case observed. |

---

## 6. Testing

### 6.1 Test Plan

The project follows a three-layer strategy: unit tests for pure helpers and reducers,
integration tests for the Edge Function behind a mocked Anthropic SDK (filed as a follow-up
ticket), and manual end-to-end runs through Chrome-in-Claude. Manual regressions are captured
as animated GIFs under `docs/screenshots/regression_2026-05-13/` and committed to the
repository so the grader can replay them without rebuilding the app.

### 6.2 Test Cases and Results

| Suite | Cases | Status |
| --- | --- | --- |
| `tests/themeUtils.test.ts` | 6 | ✅ |
| `tests/themeContext.test.tsx` | 3 | ✅ |
| `tests/rruleHelpers.test.ts` | 37 | ✅ |
| `tests/eventFormSchema.test.ts` | 21 | ✅ |
| `tests/todoReducer.test.ts` | 9 | ✅ |
| `tests/priorityInference.test.ts` | 8 | ✅ |
| **Total** | **84** | **✅ all green** |

A full manual regression sweep on 2026-05-13 covered authentication, calendar view switching,
event CRUD, recurring presets, category management, theme toggling, todo CRUD, AI chat panel,
NL quick-add intercept, undo toasts, priority and category inference, drag-drop, voice
button visibility, holidays, tooltips, and console / network health. The regression scored
**50 of 54 cases as PASS**, the remainder split between one regression bug (the J2 priority
inference gap fixed in PR #78) and two skipped checks for browser features the headless test
environment cannot reach (microphone permission, deny path for camera).

### 6.3 Bug Log

| ID | Title | Status |
| --- | --- | --- |
| #61 | Todo doesn't appear on calendar | Closed in Sprint 1 |
| #62 | Calendar event categories + colors buggy | Closed in Sprint 1 |
| #73 | Priority inference for ASAP / urgent keywords | Closed by PR #78 |
| #76 | Todo panel doesn't live-update after AI-created todos | Open — Phase 4 polish |
| #79 | `find_free_time` gap finder records overlapping slot | Open — Phase 4 polish |

### 6.4 Outcomes

The two open bugs are both low-severity UX edges (a reload fixes #76; the LLM compensates
for #79 by reading the proposed slot back and warning the user). No regression introduced by
a closing-day feature blocked the demo path.

---

## 7. User Manual

### 7.1 Installation (developer)

```bash
nvm use                                # Node 24 (see .nvmrc)
npm install
cp .env.example .env.local             # fill in VITE_SUPABASE_URL + key
supabase link --project-ref dlzwktnvxzkqultwjstm
supabase db push                       # apply migrations 001, 002
supabase functions deploy ai-assistant
npm run dev                            # http://localhost:5173/CSC-710-AI-Calendar/
```

### 7.2 Running (end user)

Visit <https://umutc.github.io/CSC-710-AI-Calendar/>, sign up with any email + password, and
land on `/dashboard`.

### 7.3 Key Screenshots and Recordings

| Surface | Artifact |
| --- | --- |
| Full app regression flow | `docs/screenshots/regression_2026-05-13/dayforma_regression_2026-05-13.gif` |
| AI vision — handwritten note → todos + event | `docs/screenshots/regression_2026-05-13/ai_vision_demo.gif` |
| Priority inference (J2) — three example todos | `docs/screenshots/regression_2026-05-13/priority_inference_fix.png` |

### 7.4 Demo Walkthrough

Three flows exercise the system's value proposition:

1. **Natural-language quick-add.** In the todo input, type *"lunch with mom next Tuesday
   at noon."* The text is recognised as event-shaped, the AI panel opens, and the assistant
   creates the event. A 30-second undo toast appears.
2. **Photo a paper note.** Click the camera button in the AI panel, take a photo of a
   handwritten list, and send with no text. The assistant OCRs the bullets and creates the
   corresponding todos and events; priorities are inferred from words like *URGENT*.
3. **Weekly summary.** From an empty AI conversation, click the "Summarize this week" chip
   (or the sparkle button in the panel header). The assistant returns a markdown summary
   that the client renders inline with tables, lists, and bold emphasis.

---

## 8. Project Management

### 8.1 Team Roles

- **Umut Çelik** — project lead, system design, frontend (dashboard, AI panel, calendar
  composer), Supabase migrations, Edge Function for the AI assistant.
- **Merve Gazi** — testing strategy, regression sweeps, Sprint 1 bug-fix pass, holiday data
  and calendar integration.
- **Justin Huang** — todo panel, AI conversation hook, voice integration (button, transcript
  pipe, TTS reply), 30-second undo toast pattern, category inference.

### 8.2 Methodology

The team ran four one-week Scrum sprints aligned with the dates in Section 19 of the
Technical Design Document:

- **Sprint 0** (Apr 22–24) — repo bootstrapping, Supabase project, RLS policies, CI deploy.
- **Sprint 1** (Apr 25 – May 1) — auth, calendar, todos, categories, theme.
- **Sprint 2** (May 2 – 8) — Claude Edge Function, NL parse, drag-drop, undo toast, holidays.
- **Sprint 3** (May 9 – 12) — voice (button + transcript + TTS), AI vision attachment,
  markdown rendering, weekly summary, priority inference fix.

### 8.3 Tooling

- **GitHub Issues + GitHub Projects** (one project board titled *Dayforma*) for backlog,
  status, and assignees.
- **Conventional Commits** for every PR title and the squashed merge.
- **WhatsApp** for async standups, plus a Google Meet sync on Sundays.
- **Anthropic Claude inside the development loop** for code review and acceleration; every
  AI-authored commit carries the `Co-Authored-By` trailer per the project's standing
  expectation.

### 8.4 Issues and Resolutions

The team encountered three project-level frictions and resolved them mid-flight:

1. *Plan / board / code drift.* On 2026-05-13 we audited the project board and found three
   issues whose statuses lagged behind the actual code (`#25` was already merged, `#32` and
   `#33` were not yet implemented). The team adopted a stricter rule: every transition
   (Todo → In Progress → In Review → Done) is applied as part of the same step that ships
   the work, never batched.
2. *Late-arriving feature.* The instructor requested image attachment for handwritten
   notes mid-Sprint 3. Rather than treating it as a manual UI feature only, the team
   extended scope to include a Claude vision route through the existing chat panel — both
   paths now live in production.
3. *Sprint-3 stretch backlog.* Mobile responsive, browser notifications, cross-tab
   realtime, offline queueing, Playwright E2E, and Edge Function integration tests were all
   formally deferred to the Phase 4 polish window (May 14–19) with a comment on each issue
   so the deferral is visible.

---

## 9. Conclusion

### 9.1 Accomplishments

- A working public deployment with all Sprint 0–3 stories delivered on time.
- 84 unit tests passing on the final branch.
- Two AI surfaces shipped: text/voice chat with seven tools, and a vision route that
  ingests handwritten notes and converts them into structured todos and events.
- A reversible AI experience — every assistant-driven write is undoable within 30 seconds.
- Full evidence trail: animated regression GIFs and a feature demo GIF for every
  closing-day shipping PR, all committed to the repository.

### 9.2 Lessons Learned

- **Scoping AI autonomy.** Acting directly is the right default *if and only if* the
  inverse mutation is cheap; the 30-second undo toast was the architecture decision that
  made the whole product feel safe.
- **Prompt caching ROI.** Pulling the stable system prompt into its own
  `cache_control: { type: "ephemeral" }` block measurably reduced both latency and cost
  once the project's conversation history grew past the second turn.
- **Realtime UX patterns.** Optimistic UI plus realtime reconciliation works for
  user-initiated writes but does not currently fire for Edge-Function-initiated inserts
  on the todos channel (see #76). The fix is straightforward and tracked.
- **Two paths beat one for handwritten notes.** The manual attach path is the right move
  for visual reference; the AI vision path is the right move for actionable content.
  Building both was inexpensive once the storage layer existed.

### 9.3 Future Work

- Mobile responsive layout — agenda by default, drawer todo panel, FAB-launched AI panel.
- Browser Notifications API with per-event reminder offsets.
- Cross-tab realtime synchronisation.
- Offline queue for AI requests under poor network conditions.
- Playwright-MCP E2E suite + integration tests for the Edge Function with a mocked Claude
  SDK.
- Cleaning up the `find_free_time` gap finder edge case (#79) and the todo Realtime gap on
  AI-created rows (#76).
- A "deny" path screenshot for camera permission to round out the user manual.
- Optional: signed URLs for the `todo-attachments` bucket when privacy needs evolve.
