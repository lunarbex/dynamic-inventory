# Object Stories — Setup Guide

## 1. Firebase Project Setup

1. Go to https://console.firebase.google.com and create a new project
2. Enable these services:
   - **Authentication** → Sign-in method → enable Email/Password and Google
   - **Firestore Database** → Create database (start in production mode)
   - **Storage** → Get started

3. In Project Settings → Your apps → Add web app → copy the config values

## 2. Environment Variables

Edit `.env.local` with your Firebase config and Anthropic API key:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

ANTHROPIC_API_KEY=sk-ant-...
```

Get your Anthropic API key at https://console.anthropic.com

## 3. Deploy Firebase Rules

Install Firebase CLI and deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore + Storage, use existing project
firebase deploy --only firestore:rules,storage
```

## 4. Firestore Index

The app needs one composite index. Deploy it:

```bash
firebase deploy --only firestore:indexes
```

Or create it manually in the Firebase Console:
- Collection: `inventory_items`
- Fields: `categories` (Arrays) + `addedAt` (Descending)

## 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 6. Production Deployment (Vercel)

```bash
npx vercel
```

Add all `.env.local` variables in Vercel's environment settings.

---

## Architecture Overview

```
src/
  app/
    page.tsx              — Home: activity zone grid + item cards
    add/page.tsx          — Add item flow (photo + voice + AI)
    search/page.tsx       — Full-text search across all items
    items/[id]/page.tsx   — Item detail with photo carousel
    api/
      process-recording/  — Claude API: extract structured data from transcript
  components/
    auth/                 — Firebase auth provider + login form
    inventory/            — AddItemFlow, VoiceRecorder, PhotoCapture, ItemCard
    layout/               — Header with navigation
  hooks/
    useAuth.ts            — Firebase auth state
    useInventory.ts       — Real-time Firestore subscription
    useVoiceRecorder.ts   — MediaRecorder + Web Speech API transcription
  lib/
    firebase.ts           — Firebase app init
    firestore.ts          — Database operations (CRUD + subscriptions)
    storage.ts            — Firebase Storage photo uploads
    types.ts              — Shared TypeScript types
```

## User Flow

1. Sign in with email or Google
2. Tap **+** to add an object
3. Take photo(s) with camera or pick from gallery
4. Hold record button and speak about the object (where it's from, what it means, where you keep it)
5. Web Speech API transcribes in real-time
6. Tap "Process with Claude" → Claude extracts: name, description, location, story, provenance, categories
7. Choose confirmation mode:
   - **Looks great** — saves immediately, won't review for 30-50 more entries
   - **Ask next time** — saves, will show review screen next time
   - **Let me adjust** — inline editing before saving
8. Item appears in inventory organized by activity zones
