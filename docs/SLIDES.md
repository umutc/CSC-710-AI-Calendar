# Dayforma — Presentation Slides

CSC 710 Software Engineering · Spring 2026 · presentation date 2026-05-13.

Source format: Markdown deck. Export to PDF via any of:
- `pandoc SLIDES.md -t beamer -o slides.pdf`
- Marp CLI: `marp SLIDES.md --pdf`
- Manual: paste into Google Slides / Keynote, one `---` per slide.

Speaker notes live under `**Notes:**` blocks; they will not render on the slide itself if you use Marp / Beamer with `<!-- _comment -->` syntax — keep them as-is for now and trim before export if needed.

---

## Slide 1 — Title

# Dayforma

### An AI-Powered Interactive Calendar

Umut Çelik · Merve Gazi · Justin Huang  
CSC 710 — Software Engineering · Spring 2026  
CUNY College of Staten Island  
2026-05-13

**Notes:** open with our names + course. Live demo URL: <https://umutc.github.io/CSC-710-AI-Calendar/>

---

## Slide 2 — The problem

- Calendars are good at **time**, bad at **intent**.
- Todo lists are good at **intent**, bad at **time**.
- AI assistants **propose** — they don't act.
- We wanted a tool where the assistant ships the work itself, with cheap undo as the safety net.

**Notes:** keep this slide short — the point is the architectural decision (act vs. propose).

---

## Slide 3 — What we built

- Multi-view calendar (Month / Week / Day / Agenda) + right-rail todo panel.
- Claude Sonnet 4.6 assistant with **seven tools**: create / update / delete event, create todo, find free time, list events, summarize week.
- **Image attachment + vision OCR** — take a photo of a paper note; the assistant turns it into structured todos and events.
- Voice in (`SpeechRecognition`) + voice out (`SpeechSynthesis`).
- 30-second Sonner Undo toast on every AI mutation.

**Notes:** mention that image attachment is the prof's mid-development request and we built two paths for it (manual + AI vision).

---

## Slide 4 — Live demo

> *Switch to the dashboard tab.*

Three flows to highlight (≈90 seconds total):
1. **Type:** "lunch with mom Friday at noon" → AI creates event → Undo toast.
2. **Photo:** capture the handwritten note → 3 todos + 1 event materialise; "URGENT" → Urgent priority.
3. **Sparkles button:** "Summarize this week" → markdown digest renders inline.

**Notes:** keep the demo crisp. Pre-loaded events in the week make the calendar feel real.

---

## Slide 5 — Architecture

```
Browser (React 18 + Vite 6 + Tailwind v4)
        │
        ▼  supabase-js (publishable key + user JWT)
Supabase  ──► Postgres (RLS) + Auth + Realtime + Storage
        │
        ▼  Edge Function (Deno + Claude SDK)
Anthropic API  ──►  Claude Sonnet 4.6
```

- The Anthropic key never leaves the Edge Function environment.
- Browser only sees Supabase's anonymous publishable key — RLS is the boundary.
- Realtime is enabled on `events` AND `todos`; both tables broadcast Postgres CDC.

**Notes:** highlight the security boundary slide — RLS + key isolation is what makes single-user safe.

---

## Slide 6 — Key technical decisions

| Decision | Why |
| --- | --- |
| 30-second Undo toast on every AI write | "Act, don't propose" only works if every action is reversible. |
| Prompt caching on the stable system prompt | Lower latency + cost; only conversation messages vary per call. |
| Vision via the Edge Function (not client-side OCR) | Same auth + same conversation; one less moving part. |
| Public-read storage bucket with RLS writes | Direct CDN thumbnails without signed-URL roundtrips. |
| Markdown-rendered AI replies (`react-markdown`) | Weekly summaries become genuinely scannable. |

**Notes:** 2–3 minutes here is plenty. Each row is one talking point.

---

## Slide 7 — Sprint cadence

- **Sprint 0** (Apr 22–24) — repo, Supabase, RLS, CI deploy.
- **Sprint 1** (Apr 25 – May 1) — auth, calendar, todos, categories, theme.
- **Sprint 2** (May 2–8) — Claude Edge Function, NL parse, drag-drop, undo, holidays.
- **Sprint 3** (May 9–13) — voice, image + vision, markdown, weekly summary, priority inference.
- **Phase 4** (May 14–19) — mobile responsive, notifications, additional tests.

**Notes:** four 1-week sprints; Scrum cadence with WhatsApp standups + Sunday sync.

---

## Slide 8 — Results

- **Live deployment** on GitHub Pages, auto-deploying from `main`.
- **94 unit tests** passing on `main` (reducers, helpers, schemas, priority + gap finder).
- **All Sprint 0–3 stories closed** on time.
- **One mid-cycle scope add** (image attachment + AI vision) shipped without missing the demo date.

**Notes:** numbers anchor credibility — read the test count + live URL aloud.

---

## Slide 9 — Lessons learned

- **Scoping AI autonomy.** The 30-second undo toast is the architecture decision that made "act, don't propose" feel safe.
- **Prompt caching ROI.** Pulling the system prompt into its own `cache_control` block measurably reduced latency once the conversation history grew.
- **Realtime UX gaps.** Optimistic UI plus realtime works for user-initiated writes; it doesn't fire automatically for Edge-Function-initiated inserts — we hit and fixed that gap during the demo-day battle test.
- **Two paths beat one.** Manual attach and AI-vision attach answer different needs; we kept both.

**Notes:** spend most time on the autonomy + undo trade-off — that's the most academically interesting beat.

---

## Slide 10 — Future work + Q&A

**Phase 4 polish (May 14–19):**
- Mobile responsive layout.
- Browser Notifications API + per-event reminders.
- Cross-tab realtime sync regression coverage.
- Playwright-MCP E2E suite + Edge Function integration tests.
- Sign-URL hardening on the attachments bucket.

**Q&A**

Live demo: <https://umutc.github.io/CSC-710-AI-Calendar/>  
Source: <https://github.com/umutc/CSC-710-AI-Calendar>  
Final report: `docs/FINAL_REPORT.md`

**Notes:** end on the live URL — leave it on screen during questions.
