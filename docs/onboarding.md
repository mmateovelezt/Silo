# 🧠 Silvio — Developer Onboarding Guide

> **Last updated:** April 2026

Welcome to the **Silvio** codebase. This document will get you from zero to productive as fast as possible. Read it top-to-bottom your first day; use it as a reference after that.

---

## 1. 🧭 Project Overview

### What is Silvio?

Silvio is a **real-time interpreter assistant** — a desktop/web application designed for professional interpreters. It captures live audio (from a screen share / system loopback), transcribes speech in real-time using **Deepgram Nova-2** (Speech-to-Text), and then translates each finalized utterance into a target language using **OpenAI GPT-4o-mini**.

Think of it as a live subtitle overlay that an interpreter can glance at during a call to confirm terminology, catch missed words, or verify their own rendition.

### Core Features

| Feature | Description |
|---|---|
| **Live STT** | Captures system audio via `getDisplayMedia` and streams it to Deepgram over a WebSocket. Shows interim (grey, streaming) and final (committed) transcripts. |
| **Real-time Translation** | Every finalized transcript segment is automatically translated via OpenAI, displayed beneath the original text. |
| **Language Quick Swap** | One-click button to swap the source ↔ target language pair mid-session (e.g., switch from ES→EN to EN→ES). |
| **Custom Glossary** | Interpreters can define mandatory terminology (e.g., "Bolsa" → "Stock Exchange"). These are injected into the GPT prompt so the model is forced to use the exact term. |
| **Professional Glossary Import** | A bundled database of ~990 EN→ES professional terms (legal, medical, financial, insurance) that can be imported in one click. |
| **Phonetic Alphabet Panel** | A quick-reference NATO phonetic alphabet popup (Alpha, Bravo, Charlie…) for spelling proper nouns over the line. |
| **Live Correction** | Double-click any original transcript to edit it. The correction is re-translated automatically. |
| **Supabase Auth** | Email/password login. Only authenticated users can use the app. |
| **Connection Status Indicator** | Visual dot showing whether the engine is connected, connecting, errored, or offline. |

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 |
| **Styling** | TailwindCSS v4 (via PostCSS plugin) |
| **Speech-to-Text** | Deepgram Nova-2 (WebSocket streaming) |
| **Translation** | OpenAI `gpt-4o-mini` |
| **Authentication** | Supabase Auth (email/password) |
| **Serverless API** | Vercel Serverless Functions (Node.js) |
| **Desktop (legacy)** | Electron 41 (still in codebase but being phased out) |
| **Deployment** | Vercel (frontend + serverless API) |

---

## 2. 🏗️ Project Structure

Here is the full directory tree, annotated:

```
Silvio/
└── interpreter-assistant/
    ├── .gitignore             # Git ignore rules (venvs, node_modules, .env, logs)
    ├── start.bat              # 🪟 Windows launcher: starts Python backend + opens browser + runs Vite dev
    ├── backend/               # 🐍 Python backend (currently EMPTY — was used for a local WebSocket bridge, now deprecated)
    │
    └── frontend/              # 🌐 The main application lives here
        ├── .env               # 🔒 Secret environment variables (NEVER committed)
        ├── .env.example       # Template showing required env vars
        ├── .gitignore         # Frontend-specific ignores
        ├── index.html         # Vite entry point — mounts #root, loads /src/main.tsx
        ├── package.json       # Dependencies and scripts (dev, build, lint, preview)
        ├── vite.config.ts     # Vite config: React plugin, Electron plugins, dev server on 127.0.0.1:5173
        ├── vercel.json        # Vercel deployment config: rewrites /api/* to serverless functions
        ├── tailwind.config.js # TailwindCSS content paths
        ├── postcss.config.js  # PostCSS pipeline (Tailwind + Autoprefixer)
        ├── tsconfig.json      # Root TS config (references app + node configs)
        ├── tsconfig.app.json  # TS config for src/ (React, DOM, strict mode)
        ├── tsconfig.node.json # TS config for build-time / Electron code
        ├── eslint.config.js   # ESLint flat config (React hooks + React Refresh rules)
        │
        ├── api/                    # ☁️ VERCEL SERVERLESS FUNCTIONS (server-side, NOT bundled in frontend)
        │   ├── health.ts           #   GET /api/health — Simple uptime check, returns { status: 'ok' }
        │   ├── stt-token.ts        #   GET /api/stt-token — Auth-gated: validates Supabase JWT, then mints a short-lived Deepgram token
        │   └── translate.ts        #   POST /api/translate — Auth-gated: receives text, calls OpenAI, returns translation
        │
        ├── electron/               # 🖥️ ELECTRON SHELL (legacy, being removed)
        │   ├── main.ts             #   Electron main process: creates BrowserWindow, handles IPC for env vars, sets up desktop capture
        │   └── preload.ts          #   Preload script: exposes `window.electronAPI.getEnv()` to renderer
        │
        ├── public/                 # 📂 STATIC FILES served at root (/)
        │   ├── favicon.svg         #   Browser tab icon
        │   └── icons.svg           #   Shared SVG icon sprite
        │
        └── src/                    # ⚛️ REACT APPLICATION SOURCE
            ├── main.tsx            #   Entry point: wraps <App /> in <AuthProvider>
            ├── App.tsx             #   🏠 Root component: all UI, language selectors, caption list, toolbar
            ├── App.css             #   Legacy CSS from initial Vite scaffold (mostly unused)
            ├── index.css           #   Global styles: Tailwind import, body reset
            ├── electron.d.ts       #   TypeScript augmentation for window.electronAPI
            │
            ├── components/                        # 🧩 REUSABLE UI COMPONENTS
            │   ├── LoginPage.tsx                  #   Full-page login form (email + password via Supabase)
            │   ├── ConnectionStatusIndicator.tsx   #   Color-coded dot + label (Online/Offline/Error/Connecting)
            │   ├── GlossaryManager.tsx            #   Modal: add/remove/import glossary entries, language-pair filtering
            │   └── PhoneticAlphabetPanel.tsx       #   Modal: NATO phonetic alphabet grid (A=Alpha, B=Bravo…)
            │
            ├── hooks/                             # 🪝 CUSTOM REACT HOOKS
            │   ├── useInterpreterEngine.ts        #   🔥 THE CORE — manages Deepgram WS, MediaRecorder, OpenAI translation, message state
            │   └── useConnectionStatus.ts         #   Monitors Vercel health + Python bridge via polling/ping-pong (partially legacy)
            │
            ├── contexts/                          # 🌍 REACT CONTEXT PROVIDERS
            │   └── AuthContext.tsx                 #   Provides { user, session, loading, signOut } to entire app tree
            │
            ├── lib/                               # 📚 SHARED LIBRARY / EXTERNAL SERVICE CLIENTS
            │   └── supabaseClient.ts              #   Initializes & exports the Supabase JS client using VITE_ env vars
            │
            ├── data/                              # 📊 STATIC DATA FILES
            │   ├── phonetic_alphabet.ts           #   Array of { letter, word } for NATO alphabet
            │   └── professional_glossary.json     #   ~990 EN→ES professional terms (200KB JSON)
            │
            └── assets/                            # 🖼️ IMAGES & ICONS
                ├── hero.png                       #   App hero image
                ├── react.svg                      #   React logo
                └── vite.svg                       #   Vite logo
```

### Folder-by-Folder Breakdown

---

#### `/frontend/api/` — Vercel Serverless Functions

These are **server-side** Node.js functions that run on Vercel's edge infrastructure. They are **not** part of the React bundle. Vercel automatically detects files in `/api/` and deploys them as HTTP endpoints.

| File | Endpoint | Method | Purpose |
|---|---|---|---|
| `health.ts` | `/api/health` | GET | Simple health check, returns `{ status: "ok" }`. Used by `useConnectionStatus` to verify the Vercel backend is alive. |
| `stt-token.ts` | `/api/stt-token` | GET | **Auth-gated.** Validates the user's Supabase access token, then calls Deepgram's `/v1/auth/grant` API to mint a short-lived JWT (10 min TTL). Returns `{ token }`. |
| `translate.ts` | `/api/translate` | POST | **Auth-gated.** Receives `{ text, source_lang, target_lang, context_str, glossary }`, calls OpenAI's Chat Completions API with a professional interpreter system prompt, returns `{ translated }`. |

> **Key security design:** API keys (Deepgram, OpenAI, Supabase service role) are stored as Vercel environment variables. They **never** reach the browser. The serverless functions act as a secure proxy.

---

#### `/frontend/src/` — The React Application

This is where almost all the code you'll touch lives.

**`main.tsx`** — The entry point. It renders the `<App />` component wrapped in `<AuthProvider>` within React's `<StrictMode>`. If you need to add a global provider (e.g., a theme context, a toast system), wrap it here.

**`App.tsx`** — The root component and effectively the **only page**. Silvio is a single-page app with no router. `App.tsx` contains:
- The **language selectors** (source STT language + target translation language)
- The **toolbar** (Start / Pause / Resume / Stop buttons)
- The **caption list** (rendered via `.map()` over `messages[]`)
- The **interim text** display (live streaming partial transcripts)
- Toggles for the **Glossary** and **Phonetic Alphabet** modals
- The **Logout** button
- Auth gating: if no user, renders `<LoginPage />`; if loading, renders a spinner

**`App.css`** — Leftover CSS from the Vite + Electron starter template. Mostly unused; the app is styled with Tailwind utility classes.

**`index.css`** — Imports TailwindCSS (`@import "tailwindcss"`) and sets the body reset (transparent background, white text, system font stack, hidden overflow).

**`electron.d.ts`** — TypeScript declaration that adds `window.electronAPI.getEnv()` to the global `Window` type. Still present for backward compatibility with Electron builds.

---

#### `/frontend/src/components/` — UI Components

| Component | Type | What it does |
|---|---|---|
| `LoginPage.tsx` | Page | Full-screen login card with email/password fields. Calls `supabase.auth.signInWithPassword()`. Shows error messages and loading spinner. |
| `ConnectionStatusIndicator.tsx` | Utility | Tiny status chip with a pulsing dot. Accepts a `status` prop (`connected`, `connecting`, `disconnected`, `error`) and displays a color + label. |
| `GlossaryManager.tsx` | Modal | Overlay panel for managing custom terminology. Features: language-pair selectors, add form (source term + target term), list of saved entries (with active/inactive visual state), import button for the bundled professional glossary, and delete buttons. Entries are persisted in `localStorage` under the key `interpreter_glossary_v2`. |
| `PhoneticAlphabetPanel.tsx` | Modal | A simple 2-column grid showing A→Alpha, B→Bravo, etc. Closes on backdrop click or Close button. Read-only reference. |

**Reusability patterns:**
- All modals use absolute positioning over the app (`absolute inset-0 z-50`) with a backdrop blur.
- Components receive callbacks (`onClose`, `setGlossary`) from `App.tsx` — state is lifted to the parent.
- TailwindCSS classes are applied inline; there are no separate CSS files per component.

---

#### `/frontend/src/hooks/` — Custom Hooks

##### `useInterpreterEngine.ts` — ⭐ The Heart of the Application

This is the most important file. It encapsulates the **entire audio processing pipeline**:

1. **Requests display media** (`getDisplayMedia`) to capture system audio
2. **Opens a WebSocket** to Deepgram's Nova-2 STT API
3. **Streams audio chunks** via `MediaRecorder` (250ms intervals)
4. **Receives transcripts** (interim + final) from Deepgram
5. **Sends final transcripts** to OpenAI for translation
6. **Manages all state**: `messages[]`, `interimText`, `status`, `errorLog`

The hook exposes:
```typescript
{
  status: EngineStatus,        // 'idle' | 'starting' | 'running' | 'paused' | 'error' | 'stopped'
  messages: STTMessage[],      // Array of { id, original, translated, is_corrected }
  interimText: string,         // Current partial/streaming transcript
  errorLog: string,            // Last error message
  startEngine: () => void,     // Begin capture + transcription
  pauseEngine: () => void,     // Pause MediaRecorder (audio stops, WS stays open)
  resumeEngine: () => void,    // Resume MediaRecorder
  stopEngine: () => void,      // Tear down everything
  clearMessages: () => void,   // Reset messages array
  updateMessageCorrection: (id, newText) => void  // Edit + re-translate
}
```

**Hot Swap feature:** If the user changes the source language *while the engine is running*, the hook automatically tears down the current WebSocket and creates a new one with the updated Deepgram language parameter — without dropping the existing audio stream.

> **⚠️ Important:** The current `useInterpreterEngine.ts` still references `window.electronAPI.getEnv()` for API keys. This means it **only works in Electron mode** right now. For pure web mode, you would need to route key retrieval through the Vercel API (`/api/stt-token`). This is a known migration in progress.

##### `useConnectionStatus.ts` — Connection Health Monitor

Monitors two services:
1. **Vercel API** — Polled every 30s via `GET /api/health`
2. **Python bridge** — Pinged via WebSocket ping/pong every 15s (legacy; the Python backend has been removed)

Returns a combined state: `connected`, `partial`, `disconnected`, or `connecting` with human-readable labels and error details.

> **Note:** This hook is currently **not actively wired** into the main app's `ConnectionStatusIndicator`. The indicator in `App.tsx` derives its status from `useInterpreterEngine.status` instead. This hook exists for future use or if the Python bridge architecture returns.

---

#### `/frontend/src/contexts/` — React Contexts

##### `AuthContext.tsx`

Provides authentication state to the entire component tree:

```typescript
{ user: User | null, session: Session | null, loading: boolean, signOut: () => Promise<void> }
```

- On mount, it calls `supabase.auth.getSession()` to restore existing sessions.
- It subscribes to `supabase.auth.onAuthStateChange()` to react to login/logout/token refresh events.
- Exposes a `useAuth()` hook for easy consumption.

---

#### `/frontend/src/lib/` — Library / Service Clients

##### `supabaseClient.ts`

Creates and exports a single Supabase client instance using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables. All frontend Supabase calls (auth) go through this shared client.

---

#### `/frontend/src/data/` — Static Data

| File | Contents |
|---|---|
| `phonetic_alphabet.ts` | Array of 26 `{ letter, word }` objects: A→Alpha through Z→Zulu |
| `professional_glossary.json` | ~990 pre-built `GlossaryEntry` objects mapping EN→ES professional terms across legal, medical, insurance, banking, education, and automotive domains. 200KB JSON file. |

---

#### `/frontend/electron/` — Electron Shell (Legacy)

| File | Purpose |
|---|---|
| `main.ts` | Electron main process. Creates a `BrowserWindow`, loads the Vite dev server or the built `dist/index.html`. Sets up `desktopCapturer` for system audio loopback. Exposes `get-env` IPC handler to securely pass environment variables from the main process to the renderer. |
| `preload.ts` | Preload script running in the renderer's isolated context. Exposes `window.electronAPI.getEnv(key)` via `contextBridge`. |

> **Status:** Electron is being phased out in favor of a pure web architecture. These files still exist and the Vite config still includes Electron plugins, but the primary deployment target is now the browser via Vercel.

---

#### `/frontend/public/` — Static Assets

| File | Purpose |
|---|---|
| `favicon.svg` | The browser tab icon |
| `icons.svg` | SVG sprite sheet for UI icons |

---

#### Root-Level Files

| File | Purpose |
|---|---|
| `start.bat` | Windows batch script that: (1) starts the Python backend in a minimized terminal, (2) waits 3 seconds, (3) opens `http://127.0.0.1:5173` in the default browser, (4) runs `npm run dev` in the frontend folder. On exit, kills the Python process. |
| `backend/` | Empty directory. Previously contained a Python WebSocket bridge (`main.py`) that acted as a middleman between the browser and Deepgram. Now deprecated — the browser connects to Deepgram directly. |

---

## 3. 🔄 Data Flow

### How audio becomes a translated caption

Here is the end-to-end flow from microphone to UI, step by step:

```
┌───────────────┐
│ 1. User clicks │
│   "Start"      │
└───────┬───────┘
        │
        ▼
┌──────────────────────────────────┐
│ 2. navigator.getDisplayMedia()   │
│    captures system audio         │
│    (the video track is           │
│    immediately discarded)        │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ 3. WebSocket opens to Deepgram   │
│    wss://api.deepgram.com/v1/    │
│    listen?language=es&model=     │
│    nova-2&interim_results=true   │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ 4. MediaRecorder captures audio  │
│    chunks every 250ms and sends  │
│    them over the WebSocket       │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ 5. Deepgram returns JSON msgs:   │
│    • is_final=false → interimText│
│      (grey text, updates in place│
│       but does NOT trigger re-   │
│       renders of the caption     │
│       list)                      │
│    • is_final=true → committed   │
│      transcript added to msgs[]  │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ 6. For each final transcript:    │
│    • A new STTMessage is added   │
│      to the messages[] array     │
│      with original text only     │
│    • OpenAI API is called with   │
│      the text + glossary prompt  │
│    • When translation returns,   │
│      the same message is updated │
│      with the translated field   │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ 7. UI renders:                   │
│    • Small grey text = original  │
│    • Large bold white = translated│
│    • Dashed border = interim     │
│    • Smart auto-scroll keeps the │
│      latest caption in view      │
│      (unless user scrolled up)   │
└──────────────────────────────────┘
```

### Live Correction Sub-Flow

```
User double-clicks original text
    → Input field appears with current text
    → User edits and presses Enter (or clicks away)
    → updateMessageCorrection(id, newText) is called
    → Message's `original` is updated, `is_corrected` = true
    → OpenAI is called again with the corrected text
    → Translation is updated in place
    → ✏️ icon appears next to the corrected original
```

### Glossary Injection Flow

```
User adds glossary entry via GlossaryManager
    → Entry saved to localStorage (interpreter_glossary_v2)
    → On next translation request:
        → useInterpreterEngine filters glossary by sourceLang + targetLang
        → Matching entries are formatted as:
            "TERMINOLOGY CONSTRAINTS (MANDATORY):
             - 'Bolsa': 'Stock Exchange'"
        → This string is injected into the GPT system prompt
        → OpenAI is forced to use these exact translations
```

---

## 4. 🔐 Auth & State Management

### Authentication

**Provider:** Supabase Auth (email + password flow)

**How it works:**

1. `AuthContext.tsx` wraps the entire app in `<AuthProvider>`
2. On mount, it calls `supabase.auth.getSession()` — if a valid session exists in the browser's storage, the user is automatically logged in
3. It subscribes to `onAuthStateChange()` to detect login, logout, and token refresh events
4. `App.tsx` checks `useAuth().user`:
   - If `loading` is true → show a spinner
   - If `user` is null → render `<LoginPage />`
   - If `user` exists → render the main interpreter UI
5. Login calls `supabase.auth.signInWithPassword({ email, password })`
6. Logout calls `supabase.auth.signOut()`

**Token usage (server-side):** The Vercel API functions (`stt-token.ts`, `translate.ts`) validate the user's Supabase access token by calling `supabase.auth.getUser(token)` with the service role key. This ensures that only authenticated users can mint Deepgram tokens or request translations.

### State Management

Silvio uses **plain React state** — no Redux, Zustand, or other state libraries.

| State | Where it lives | Persistence |
|---|---|---|
| Auth (user, session) | `AuthContext` | Supabase handles session storage automatically in `localStorage` |
| Engine status, messages, interimText | `useInterpreterEngine` hook | In-memory only (lost on refresh) |
| Source/target language selection | `App.tsx` local `useState` | In-memory only |
| Glossary entries | `App.tsx` local `useState` | `localStorage` key `interpreter_glossary_v2` |
| Glossary/Phonetic panel open state | `App.tsx` local `useState` | In-memory only |
| Editing state (correction UI) | `App.tsx` local `useState` | In-memory only |

---

## 5. ⚙️ Key Files to Understand First

Read these files **in this order** for the fastest ramp-up:

| # | File | Why |
|---|---|---|
| 1 | `src/hooks/useInterpreterEngine.ts` | **The engine.** This is where audio capture, Deepgram streaming, and OpenAI translation all happen. Understanding this file means understanding 80% of the app's logic. |
| 2 | `src/App.tsx` | **The UI.** Shows how the engine hook is consumed, how messages are rendered, how language selectors work, and how all modals are toggled. |
| 3 | `src/contexts/AuthContext.tsx` | **Auth flow.** Small file but essential — shows how login state is managed and propagated. |
| 4 | `src/lib/supabaseClient.ts` | **Supabase setup.** One-liner but you need to know where the client is initialized. |
| 5 | `api/stt-token.ts` | **Server-side auth + Deepgram token.** Shows how the server validates users and mints temporary API tokens. |
| 6 | `api/translate.ts` | **Server-side translation.** Shows the OpenAI prompt structure and glossary injection logic. |
| 7 | `src/components/GlossaryManager.tsx` | **Glossary system.** Shows the terminology constraint approach — important for understanding translation quality tuning. |
| 8 | `.env.example` | **Environment variables.** Know what keys you need before you can run anything. |

---

## 6. 🚀 How to Run the Project

### Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9
- A **Supabase** project with Auth enabled (email/password provider)
- A **Deepgram** API key
- An **OpenAI** API key (for translation)
- A modern browser (Chrome recommended — `getDisplayMedia` with audio requires Chrome)

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd interpreter-assistant/frontend
npm install
```

### Step 2: Set Up Environment Variables

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Supabase (frontend — needs VITE_ prefix to be available to the browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key

# Supabase (server-side only — NO VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key

# If using the Electron path (legacy):
# DEEPGRAM_API_KEY=your_deepgram_key
# OPENAI_API_KEY=your_openai_key
```

> **For Vercel deployment**, set `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel Dashboard → Project Settings → Environment Variables.

### Step 3: Start the Dev Server

```bash
npm run dev
```

This starts Vite on `http://127.0.0.1:5173`.

### Step 4: Open in Browser

Navigate to `http://127.0.0.1:5173`. You should see the login page. Sign in with a Supabase-registered email/password.

### Alternative: Use start.bat (Windows)

From the `interpreter-assistant/` root:

```bash
start.bat
```

This will:
1. Start the Python backend (if it exists in `backend/`)
2. Wait 3 seconds
3. Open the browser to `http://127.0.0.1:5173`
4. Run `npm run dev`

### Available npm Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start the development server with hot reload |
| `build` | `tsc -b && vite build && electron-builder` | Type-check, build, and package Electron app |
| `lint` | `eslint .` | Run ESLint on the whole project |
| `preview` | `vite preview` | Preview the production build locally |

---

## 7. 🧩 How to Add Features

### Adding a New UI Component

1. Create a new file in `src/components/`, e.g., `MyComponent.tsx`
2. Use Tailwind utility classes for styling (no separate CSS files)
3. If it's a modal/panel, follow the pattern in `GlossaryManager.tsx`:
   - Wrap with `absolute inset-0 z-50 bg-black/60 backdrop-blur-sm`
   - Accept an `onClose` prop
   - Use `onClick stopPropagation` on the inner panel
4. Import and render it in `App.tsx`, controlled by a boolean `useState`
5. Add a toolbar button to toggle it

### Adding a New Custom Hook

1. Create a new file in `src/hooks/`, e.g., `useMyFeature.ts`
2. Follow the `useInterpreterEngine` pattern: return an object with state + action functions
3. Consume it in `App.tsx` or the relevant component

### Adding a New API Endpoint

1. Create a new file in `api/`, e.g., `api/my-endpoint.ts`
2. Export a default handler function:
   ```typescript
   import type { VercelRequest, VercelResponse } from '@vercel/node';

   export default async function handler(req: VercelRequest, res: VercelResponse) {
     // Set CORS headers
     res.setHeader('Access-Control-Allow-Origin', '*');
     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

     if (req.method === 'OPTIONS') return res.status(200).end();

     // Your logic here
     return res.status(200).json({ result: 'ok' });
   }
   ```
3. If it needs authentication, copy the Supabase JWT validation pattern from `stt-token.ts`
4. The endpoint will be available at `/api/my-endpoint` after deployment (or via Vercel CLI locally)

### Adding a New Data File

1. Place static data in `src/data/`
2. For TypeScript data, export typed constants (see `phonetic_alphabet.ts`)
3. For large JSON datasets, use `.json` files and import them directly (bundled by Vite)

### Adding a New Language

1. **Source (STT) languages:** Add to the `STT_LANGUAGES` array in `App.tsx` (use Deepgram's language codes)
2. **Target (translation) languages:** Add to `TARGET_LANGUAGES` in `App.tsx`
3. **Quick Swap mapping:** Update `LANGUAGE_MAPPING` and `DEFAULT_STT_MAP` in `App.tsx`

### Modifying the Translation Prompt

The GPT prompt is defined in two places:
1. **Client-side (Electron path):** `useInterpreterEngine.ts` → `getTranslation()` function
2. **Server-side (Vercel path):** `api/translate.ts` → the `prompt_system` and `prompt_user` strings

Both use the same structure:
- System prompt: "You are a professional interpreter. Translate strictly from X to Y. [glossary constraints]"
- User prompt: "Translate this text: [transcript]"

---

## 8. ⚠️ Important Notes / Gotchas

### 🚨 Electron vs. Web Mode Confusion

The codebase is in a **transition state** from Electron to pure web. Key implications:

- `useInterpreterEngine.ts` calls `window.electronAPI.getEnv('DEEPGRAM_API_KEY')` and `window.electronAPI.getEnv('OPENAI_API_KEY')` — **this only works when running inside Electron.** In a browser, `window.electronAPI` is `undefined`, and the engine will throw an error at startup.
- The Vercel serverless functions (`api/stt-token.ts`, `api/translate.ts`) are the **web-safe** path for accessing these keys, but the main hook doesn't use them yet.
- If you run `npm run dev` in a browser (not Electron), the Start button will fail with "Electron API is not available." This is expected and is the primary migration gap.

### 🎤 Audio Capture Requires Chrome

`getDisplayMedia()` with system/loopback audio is **only reliably supported in Chrome**. Firefox and Safari do not support capturing system audio this way. The app will not work in those browsers.

### 💾 Glossary is Client-Side Only

All custom glossary entries are stored in `localStorage`. There is no server-side persistence or sync. If the user clears browser data, the glossary is gone. The professional glossary is bundled with the app and can be re-imported.

### 🔑 VITE_ Prefix Matters

Only environment variables prefixed with `VITE_` are available to the browser-side code. Secret keys (Deepgram, OpenAI, Supabase service role) must **NOT** have the `VITE_` prefix — they should only be used in the `api/` serverless functions.

### ⏱️ Deepgram Token TTL

The token minted by `/api/stt-token` is valid for 10 minutes (600 seconds). If a session lasts longer, the WebSocket will disconnect. A token refresh mechanism would need to be implemented for long sessions.

### 🔄 Hot Swap Debounce

When changing languages mid-session, the hot swap logic in `useInterpreterEngine.ts` has a 500ms debounce timer. If a user rapidly changes both the source and target dropdowns, only the last change takes effect.

### 📜 Comments in Spanish

You'll find comments and variable names in Spanish throughout the codebase (e.g., "Contenedor de Captions", "Selector de Entrada"). This is because the project was originally developed by a Spanish-speaking team. Use English for all new code.

### 🧹 Unused Code

- `App.css` is mostly boilerplate from the Vite scaffold and is not actively used.
- The `dist-electron/` folder is generated by Electron builds — it's gitignored but may appear locally.
- The `backend/` folder is empty. It previously contained a Python WebSocket bridge that forwarded audio to Deepgram. This intermediary has been removed in favor of direct browser → Deepgram WebSocket connections.

### 📦 Package Size

The `professional_glossary.json` is 200KB. It's bundled directly into the JavaScript output. If the glossary grows significantly, consider lazy-loading it or moving it to a CDN/API endpoint.

---

## 9. 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                 │
│                                                         │
│  ┌─────────────┐   ┌──────────────────────────────┐     │
│  │  AuthContext │   │  useInterpreterEngine        │     │
│  │  (Supabase)  │   │  ┌────────────┐              │     │
│  └──────┬──────┘   │  │MediaRecorder│──audio──┐    │     │
│         │          │  └────────────┘         │    │     │
│         │          │                         ▼    │     │
│  ┌──────▼──────┐   │              ┌──────────────┐│     │
│  │   App.tsx    │◄──┤              │  Deepgram WS ││     │
│  │  (UI Layer)  │   │              │  (Nova-2 STT)││     │
│  └─────────────┘   │              └──────┬───────┘│     │
│         │          │                     │        │     │
│         │          │           transcript │        │     │
│         │          │                     ▼        │     │
│         │          │              ┌──────────────┐│     │
│         │          │              │  OpenAI API  ││     │
│         │          │              │  (gpt-4o-mini)││     │
│         │          │              └──────────────┘│     │
│         │          └──────────────────────────────┘     │
│         │                                               │
│         │  ┌──────────────┐  ┌───────────────────┐      │
│         ├──┤ GlossaryMgr  │  │PhoneticAlphabetPnl│      │
│         │  └──────────────┘  └───────────────────┘      │
│         │  ┌──────────────┐                              │
│         └──┤  LoginPage   │                              │
│            └──────────────┘                              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
         ┌────────────▼────────────┐
         │   VERCEL SERVERLESS     │
         │                         │
         │  /api/health            │
         │  /api/stt-token         │
         │  /api/translate         │
         │                         │
         │  (Supabase auth check)  │
         │  (Deepgram token mint)  │
         │  (OpenAI translation)   │
         └────────┬────────────────┘
                  │
    ┌─────────────┼──────────────┐
    ▼             ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│Supabase│  │ Deepgram │  │  OpenAI  │
│  Auth  │  │   API    │  │   API    │
└────────┘  └──────────┘  └──────────┘
```

---

## 10. 📎 Quick Reference

### Key URLs

| Environment | URL |
|---|---|
| Local dev | `http://127.0.0.1:5173` |
| Vercel production | Your Vercel deployment URL |
| Supabase dashboard | `https://app.supabase.com` |
| Deepgram console | `https://console.deepgram.com` |
| OpenAI dashboard | `https://platform.openai.com` |

### Key localStorage Keys

| Key | Content |
|---|---|
| `interpreter_glossary_v2` | JSON array of `GlossaryEntry` objects |
| `sb-*` | Supabase session tokens (managed by Supabase SDK) |

### Key TypeScript Types

| Type | Defined in | Description |
|---|---|---|
| `STTMessage` | `hooks/useInterpreterEngine.ts` | `{ id, type, original?, translated?, is_final?, is_corrected? }` |
| `EngineStatus` | `hooks/useInterpreterEngine.ts` | `'idle' \| 'starting' \| 'running' \| 'paused' \| 'error' \| 'stopped'` |
| `GlossaryEntry` | `components/GlossaryManager.tsx` | `{ id, sourceLang, targetLang, sourceTerm, targetTerm }` |
| `PhoneticEntry` | `data/phonetic_alphabet.ts` | `{ letter, word }` |
| `ConnectionState` | `hooks/useConnectionStatus.ts` | `{ overall, vercel, python, label, errorDetail }` |

---

**Happy coding! If something is unclear, check the file references above or ask the team. 🚀**
