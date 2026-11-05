# NOFAP — Reclaim Your Control

A premium white-first, mobile-responsive React + TypeScript application for compassionate habit awareness, structured challenges, journaling, urge-management practice and personal development.

## Firebase project configured

This repository is pre-configured for Firebase project **project-01-5a1fa**. The Firebase Web SDK configuration is included as public client configuration in src/lib/firebase.ts and .env.example. Environment variables can override these defaults. Firebase Web API keys identify the project; they do not authorize access to user records. Firestore Security Rules and App Check protect data and app resources.

Google Analytics is intentionally not initialized because this app handles sensitive personal behaviour and journal metadata. The optional measurementId is retained in config, but no analytics collection is started.

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
- Custom habit tracker and data-derived insights.
- Scientific learning centre with an ICD-11 reference and evidence-aware framing.
- Local JSON export and local-data deletion.
- Firebase Email/Password Authentication and Firestore sync adapter.
- Owner-scoped Firestore security rules and Firebase Hosting configuration.
- Optional Gemini callable Function with server-side secret, authentication, explicit consent and structured input validation.

## One-time Firebase Console setup

The SDK configuration is already wired, but backend products must be enabled in your Firebase account:

1. Open https://console.firebase.google.com/project/project-01-5a1fa/overview.
2. Go to Authentication → Sign-in method. Enable Email/Password and save.
3. Go to Firestore Database → Create database. Choose a region close to your users. Do not leave permissive test-mode rules enabled.
4. Verify the Web App in Project settings → Your apps has the same app ID as this repository.
5. Add your deployment hostname under Authentication → Settings → Authorized domains if it is not already listed.

Firebase services cannot be activated just by committing a web SDK config file; these console steps are required once.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/alok-yd/No-Fap-tracker.git
cd No-Fap-tracker
npm install
npm run dev
```

The committed Firebase configuration is used automatically. For local overrides, copy .env.example to .env.local and edit the values. .env.local is ignored by Git.

Build locally with npm run build; preview with npm run preview.

## Deploy Hosting and Firestore rules

Install and sign in to Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase projects:list
```

The .firebaserc file selects project-01-5a1fa as the default project. Deploy the static app and secure Firestore rules:

```bash
firebase deploy --only hosting,firestore:rules
```

Hosting serves the Vite dist output with an SPA rewrite to index.html. The site will be available on the project's Firebase Hosting domain after a successful deployment.

## Firestore data model and rules

The app writes its current state to users/{uid}/private/appData. The included rules allow that authenticated user to read and write only their own private document; all other paths are denied. Deploy with firebase deploy --only firestore:rules. Test rules with the Firebase Emulator Suite before production use. As journal history grows, consider moving daily logs and journal entries into separate subcollections to stay comfortably below Firestore's per-document size limit.

## Gemini AI setup

The Gemini key is a Firebase Functions secret. Never put it in a VITE_ variable or frontend source.

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

The included default model is gemini-3.8-flash; verify Google's currently supported model list before production. AI is disabled by default and requires user consent. Insight requests contain up to 14 structured check-ins only; journal entries and free-text reflections are excluded. Configure Firebase App Check and enable enforceAppCheck before public production deployment.

## Known limitations / production checklist

This is an implemented starter, not a fully audited production health product.

- Guest data uses browser localStorage; it is not an encrypted vault.
- Cloud sync stores one private app-data document per user. Test rules, backup/restore, Firestore limits and conflict handling before relying on it.
- Push/local notification delivery is not wired; reminder preferences are saved only.
- Profile image upload and complete Firebase account/cloud-data deletion workflows are not implemented yet.
- Awareness mode counts recorded check-ins rather than unlogged days.
- Charts are descriptive; correlations do not establish causes.
- Learning articles are introductory summaries; add a reviewed bibliography before public launch.
- No diagnosis or treatment is provided. Recommend qualified professional support for severe distress or meaningful impairment.

## Safety principles

- No shame-based messages or fear tactics.
- Wet dreams and involuntary nocturnal emissions are not relapses.
- A reported behaviour does not erase past records.
- Pornography and masturbation are tracked independently.
- No unsupported semen-retention, testosterone or dopamine-reset promises.
- AI is optional, consent-gated, non-diagnostic and excludes journal text by default.
- Private data must never be sold or used for unrelated purposes.
