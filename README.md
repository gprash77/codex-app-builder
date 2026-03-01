# TasteBridge

A multilingual movie and TV recommendation app built with Next.js, React, Tailwind CSS v4, and shadcn/ui.

## What it does

- Gives top 3 recommendations based on genre, language, mood, and time budget.
- Supports a hidden-gem mode to reduce popularity bias.
- Adds a cross-language bridge pick for discovery outside your usual language.
- Explains each recommendation with concise "why this pick" reasons.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Connect TMDB (free API)

1. Create a free API key at [TMDB Settings > API](https://www.themoviedb.org/settings/api).
2. Create `.env.local` in the project root:

```bash
TMDB_API_KEY=your_tmdb_api_key_here
```

Without this key, the app automatically falls back to local mock data.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Dev event tracking

UI interactions are tracked locally during development (filters, hidden-gem toggle, surprise action).
Events are stored in browser localStorage under `tastebridge.events`.
