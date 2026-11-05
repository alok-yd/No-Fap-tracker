# NOFAP — Reclaim Your Control

A mobile-first, white-first React + TypeScript starter for a compassionate habit-awareness and personal-development app.

## What is implemented in this starter

- Five-section navigation: Home, Tracker, Journal, Insights and Profile.
- Strict light-only design system with white surfaces and indigo/violet accents.
- Challenge setup for 30/60/90-day and custom durations; pause/resume and history.
- Local-calendar date helpers and goal-specific tracking (pornography, masturbation, both, or awareness).
- Daily check-ins with self-reported behaviours, urge intensity, mood, triggers, sleep, exercise and reflection.
- Journal create/edit/delete, search and category filtering.
- Urge toolkit: 10-minute pause timer, breathing guide and urge-surfing instructions.
- Habit list, local export, and local data deletion.
- Charts derived only from the user's saved check-ins; empty states instead of seeded analytics.
- Optional AI endpoint template in `functions/` with server-side Gemini secret, Firebase ID-token verification, explicit consent and cautious non-diagnostic instructions.
- Firestore rules template that scopes private documents to the authenticated UID.

## Important implementation status

This is a **working front-end starter**, not yet a production-complete release. The current UI persists to browser `localStorage`; Firebase Authentication and Firestore CRUD have not yet been wired into the client. The AI button calls `/api/ai-insights`, so it remains unavailable until you configure a secure authenticated backend route or adapt the included Firebase Function and point the client to its deployed URL. Reminder preferences are saved, but push/local notification delivery is not implemented yet. There is no real account sign-in screen in this starter build.

Do not deploy this as a cloud multi-user service until authentication, Firestore persistence, App Check, security rules, data export/deletion flows, and server-side AI are configured and tested.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Firebase / Gemini next steps

1. Create a Firebase project and enable Email/Password Authentication and Cloud Firestore.
2. Configure the web app's Firebase client SDK and implement Auth state handling.
3. Replace `localStorage` storage calls with per-user Firestore subcollections. Suggested shape:
   - `users/{uid}` — profile and preferences
   - `users/{uid}/challenges/{challengeId}`
   - `users/{uid}/dailyLogs/{YYYY-MM-DD}`
   - `users/{uid}/journalEntries/{entryId}`
   - `users/{uid}/habits/{habitId}`
   - `users/{uid}/aiInsights/{insightId}`
4. Deploy `firestore.rules` and test that one user cannot read or write another user's documents.
5. Deploy the function in `functions/`. Set the Gemini key as a Firebase Functions secret, never as a `VITE_*` variable:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

6. Configure `GEMINI_MODEL` in the functions environment to a currently supported Gemini model. Update the function CORS allowlist to your real production origin, enable Firebase App Check, and send the Firebase ID token from the client.
7. Add reviewed, linked sources for educational articles before release. Avoid medical claims and keep the non-shaming product philosophy.

## Product and safety notes

- Streaks are goal-specific; pornography and masturbation are tracked independently.
- An awareness challenge rewards completed check-ins, not abstinence.
- A reported behaviour does not erase historical data.
- Involuntary nocturnal emissions are not tracked as relapses.
- Correlations in charts/AI summaries must not be presented as causes.
- Journal text is sensitive. Keep AI off by default and obtain explicit consent before transmitting reflections.

## Repository layout

```text
src/
  App.tsx
  types.ts
  styles.css
  lib/dates.ts
  lib/storage.ts
functions/
  src/index.ts
firestore.rules
```

The complete starter source bundle is available as `NOFAP-Reclaim-Your-Control-Starter.zip` in the repository.
