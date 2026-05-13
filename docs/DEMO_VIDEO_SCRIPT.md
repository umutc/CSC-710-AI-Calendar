# Dayforma — Demo Video Script

Target length: ~3 minutes. Resolution: 1920×1080. Recorder: Loom / QuickTime / OBS.
Audio: headset mic, single take per section, light edit.

Live URL during recording: <https://umutc.github.io/CSC-710-AI-Calendar/>  
Test account: 05umutcelik@gmail.com

---

## 0. Pre-flight (do not record)

- [ ] Sign in on the live deployment so the dashboard is ready.
- [ ] Confirm the calendar week is reasonably populated (1–3 existing events) so the views aren't empty.
- [ ] Hide other browser tabs / favicons; close notifications.
- [ ] Open a fresh Notes window with one paragraph of "handwritten" tasks ready to photograph (e.g. "Buy milk and eggs / Gym 7am tomorrow / Call dentist / Finish report URGENT").
- [ ] Mute system sound effects so the assistant TTS comes through cleanly.

---

## 1. Intro (0:00 – 0:15)

**On screen:** dashboard, calendar in Week view.

**Voice-over:**

> "Hi — I'm Umut, and this is Dayforma, an AI-powered calendar and todo app built for CSC 710 Software Engineering. The pitch is simple: a calendar that talks back. Type, drag, speak, or even snap a photo, and Claude takes the action for you."

---

## 2. Sign-in glance + layout (0:15 – 0:30)

**On screen:** brief click through landing → login → dashboard.

**Voice-over:**

> "Auth is Supabase. RLS gates every table, so each user only sees their own data. On the left is FullCalendar with Month / Week / Day / Agenda views. On the right is the todo panel. Bottom-right tucks the AI assistant."

---

## 3. Natural-language quick-add (0:30 – 1:00)

**Actions:**
1. Click the todo quick-add input.
2. Type: `lunch with mom Friday at noon`.
3. Press Enter. The text matches the natural-language heuristic and routes to the AI panel.
4. AI replies: "Scheduled Lunch with Mom for Friday at 12 PM."
5. Calendar updates immediately; a green "Event created · Undo" toast appears bottom-right.
6. Hover over the toast for 5 seconds without clicking — let it expire.

**Voice-over:**

> "Type a phrase and it lands as a real event. Behind the scenes the assistant calls Claude with the seven tool definitions and runs a Postgres insert. Every AI mutation gets a 30-second Undo toast — if I had clicked it, the event would vanish."

---

## 4. Drag-drop scheduling (1:00 – 1:20)

**Actions:**
1. Switch the calendar to Day view.
2. Grab the todo "Prep CSC 710 slides" from the right panel.
3. Drop it on the 2 PM slot.
4. AI infers a 1-hour duration. Event appears; todo flips to "Scheduled".
5. Drag a second todo while **holding Shift** — note the manual-placement path skips the AI.

**Voice-over:**

> "If I just want to grab a todo and slot it onto the calendar, drag it. The assistant picks a duration. Hold Shift and the AI stays out of the way."

---

## 5. Voice (1:20 – 1:45)

**Actions:**
1. Open the AI panel.
2. Press and hold the mic button.
3. Say: "Find a 45-minute slot tomorrow afternoon."
4. Release.
5. The assistant calls `find_free_time`, returns ranges, and speaks the reply back via SpeechSynthesis.

**Voice-over:**

> "Voice in, voice out. The Web Speech API transcribes the request, the Edge Function forwards it to Claude as a normal turn, and the response gets read back. This works in Chrome and Edge; everywhere else a banner tells the user."

---

## 6. Image attachment + Claude vision (1:45 – 2:30)

**Actions:**
1. In the AI panel, click the camera icon next to the mic.
2. Permission dialog → Allow.
3. Hold the prepared handwritten-style note in front of the webcam.
4. Click **Capture**.
5. Click **Send** with no text.
6. Wait ~7 seconds.
7. Assistant returns a markdown summary: 3 todos + 1 event. The "URGENT" line on the note becomes a todo with the **Urgent** badge. "Gym 7am tomorrow" lands on the calendar with the Health category and a 1-hour duration.
8. Three "Todo created" toasts + one "Event created" toast appear — leave them.

**Voice-over (slower, emphasis here — this is the differentiator):**

> "This is the demo's highlight. Take a photo of a handwritten note, send it to the assistant with no text, and Claude reads the page. It OCR's the bullets, calls `create_todo` for the un-dated items, calls `create_event` for the timed one, and infers priority from the word 'urgent'. The vision call lives entirely in the Edge Function — the public bucket only holds the image."

---

## 7. Weekly summary (2:30 – 2:45)

**Actions:**
1. In the AI panel, click the Sparkles button (header) OR click the "Summarize this week" chip on the empty state.
2. Assistant returns a markdown digest: heading, bullet list of events, bullet list of pending todos.
3. Markdown renders inline — show the bold dates and the bullet points.

**Voice-over:**

> "One click pulls a weekly digest. The reply is real markdown — `react-markdown` plus `remark-gfm` — so headings, tables, bold, links all render natively in the panel."

---

## 8. Wrap (2:45 – 3:00)

**On screen:** GitHub repo or live demo URL.

**Voice-over:**

> "That's Dayforma. Single page React + Vite, Supabase for everything in between, Claude Sonnet 4.6 for the agent. Source at github.com/umutc/CSC-710-AI-Calendar — live demo linked in the README. Thanks for watching."

---

## Editing notes

- Cut any dead air between sections; bumper music optional but at very low volume so TTS stays audible.
- If the image capture step takes too long live, hard-cut from "click Send" to the assistant's reply.
- Always show the Undo toast at least once so the reversibility story is on tape.
- Aspect ratio 16:9; keep the FullCalendar typography readable — bump browser zoom to 110% if the cell text looks small.

## Acceptance checklist before export

- [ ] All seven shipped features visible on tape (auth, NL, drag-drop, voice, image, summary, undo).
- [ ] No personal data of the real account is shown beyond what the rubric needs.
- [ ] Demo URL visible in the final frame so the grader can click through.
- [ ] Final mp4 attached to the v1.0.0 GitHub release (see #48).
