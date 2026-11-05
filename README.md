# NOFAP — Reclaim Your Control

A premium white-first, mobile-responsive React + TypeScript application for compassionate habit awareness, structured challenges, journaling, urge-management practice and personal development.

## Included

- Five-section app: Home, Tracker, Journal, Insights and Profile.
- Strict light-only interface with white cards, soft gray surfaces and indigo/violet accents.
- 30/60/90-day or custom challenges; pause/resume and history.
- Goal-specific tracking: pornography, masturbation, both, or awareness-only.
- Local-calendar date helpers designed to avoid UTC date drift.
- Daily check-ins for self-reported behaviour, urge intensity, mood, triggers, sleep, exercise and productivity.
- Journal creation, editing, deletion, category filtering and search.
- Non-shaming lapse reflection; history is preserved.
- Urge toolkit: 10-minute delay, guided 4–2–6 breathing and urge-surfing steps.
- Custom habit tracker.
- Data-derived insights (no seeded fake progress).
- Scientific learning centre with an ICD-11 reference and evidence-aware framing.
- Local JSON export and local-data deletion.
- Optional Gemini callable Function with server-side secret, authentication, explicit consent and structured input validation.
- Firestore rules scoped to the authenticated UID.
- Guest mode with browser localStorage; optional Firebase Auth and Firestore sync.

## Run locally

Requirements: Node.js 20+ and npm.

1. Copy `.env.example` to `.env.local`.
2. Run `npm install`.
3. Run `npm run dev`.

The app works in local-only guest mode without Firebase configuration. For cloud sync, create a Firebase project, add a Web App, enable Email/Password Authentication and Cloud Firestore, then populate `.env.local`.

Build with `npm run build`; preview with `npm run preview`.

## Firebase setup

Deploy the included Firestore rules with `firebase deploy --only firestore:rules`. The app stores a user's private document at `users/{uid}/private/appData`. Rules permit access only when `request.auth.uid` matches `{uid}`. Test with Firebase Emulator Suite before production.

## Gemini AI setup

The Gemini key is a Firebase Functions secret. Never put it in a `VITE_*` variable or frontend source.

1. Run `cd functions && npm install`.
2. From the repository root, run `firebase functions:secrets:set GEMINI_API_KEY`.
3. Deploy with `firebase deploy --only functions`.

Optional: configure `GEMINI_MODEL` as a Functions parameter. The included default is `gemini-3.8-flash`; verify Google's currently supported model list before production. AI is disabled by default. The user must enable AI and give consent in Profile. An insight request contains up to 14 structured check-ins only; journal entries and free-text reflections are excluded. The callable requires Firebase Authentication. Configure Firebase App Check and enable `enforceAppCheck` before public production deployment.

## Known limitations / production checklist

This is an implemented starter, not a fully audited production health product.

- Guest data uses browser localStorage; it is not an encrypted vault. Use a trusted device and protect the device account.
- Cloud sync stores one private app-data document per user. Test rules, backup/restore, Firestore limits and conflict handling before relying on it.
- Push/local notification delivery is not wired; reminder preferences are saved only.
- Profile image upload and complete Firebase account/cloud-data deletion workflows are not implemented yet.
- Streaks are goal-specific. Awareness mode counts recorded check-ins rather than unlogged days.
- Charts are descriptive; correlations do not establish causes.
- Learning articles are introductory summaries; add a reviewed bibliography and editorial review before public launch.
- No diagnosis or treatment is provided. Recommend qualified professional support for severe distress or meaningful impairment.

## Safety principles

- No shame-based messages or fear tactics.
- Wet dreams and involuntary nocturnal emissions are not relapses.
- A reported behaviour does not erase past records.
- Pornography and masturbation are tracked independently.
- No unsupported semen-retention, testosterone or dopamine-reset promises.
- AI is optional, consent-gated, non-diagnostic and excludes journal text by default.
- Private data must never be sold or used for unrelated purposes.

## Repository layout

- `src/App.tsx` — application screens and interactions
- `src/styles.css` — white-first responsive design system
- `src/types.ts` — domain types and defaults
- `src/lib/dates.ts` — local-date and streak helpers
- `src/lib/storage.ts` — local storage and export
- `src/lib/firebase.ts` — auth, Firestore and AI callable adapter
- `functions/src/index.ts` — secure Gemini callable
- `firestore.rules` — owner-scoped rules
