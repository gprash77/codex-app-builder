# What to Watch Plan

This file is the working roadmap for product, quality, and release execution.

## Phase 1: Stabilize Core (Week 1)

### Goals
- Improve reliability and observability.
- Reduce confusion in availability/provider behavior.

### Scope
- Add region selector (default `US`) for provider availability.
- Add stronger API error handling and retry UX.
- Standardize fallback notices.
- Add API-level tests for `/api/recommendations` behavior.

### Evals (Quality Checks)
- API success rate >= 98% for recommendation requests.
- Fallback rate tracked and visible in logs/analytics.
- No uncaught client errors in recommendation flow.
- Test coverage for API route and provider enrichment added.

### Exit Criteria
- Region-aware providers are visible and correct.
- Clear error/fallback UX with no broken states.
- CI runs lint + tests + build cleanly.

## Phase 2: Recommendation Quality (Weeks 2-3)

### Goals
- Make recommendations feel more personal and useful.

### Scope
- Add user feedback controls (`Not this`, `More like this`).
- Use feedback signals to re-rank future picks.
- Better parsing of prompt intent (runtime, decade, tone).
- Improve diversity logic while preserving relevance.

### Evals
- Prompt-to-match quality score (manual rubric) improves over baseline.
- Fewer repeated titles across similar queries.
- Better language intent adherence for multilingual prompts.

### Exit Criteria
- Re-ranking responds to feedback within session.
- Top-3 quality subjectively improved in dogfooding tests.

## Phase 3: Accounts and Persistence (Weeks 3-4)

### Goals
- Persist user state and taste profile.

### Scope
- Add auth.
- Save preferences, watchlist, and feedback history.
- Persist query history and recommendation sets.

### Evals
- Returning user receives consistent personalized results.
- Saved list actions are durable and recoverable.

### Exit Criteria
- Authenticated users retain profile and recommendations across sessions.

## Phase 4: Launch Polish (Week 5)

### Goals
- Prepare production-ready experience.

### Scope
- Mobile-first polish pass.
- Accessibility pass (focus states, keyboard nav, contrast).
- SEO/social metadata refinement.
- Performance and caching optimization.

### Evals
- Lighthouse targets: Performance >= 85, Accessibility >= 90.
- Core pages stable on mobile + desktop.

### Exit Criteria
- Public-ready UX and baseline technical quality gates pass.

## Phase 5: Advanced Differentiators (Backlog)

### Candidate Features
- Group recommendations (multi-user taste merge).
- Taste DNA visualization.
- Region-specific provider alerts.
- Playlist-style “tonight plan” recommendations.

## Ongoing Engineering Evals

Run on every meaningful change:
- `npm run lint`
- `npm run test`
- `npm run build`

Add soon:
- API integration tests for TMDB/provider paths.
- E2E tests for search -> filter -> recommendation flow.

## Execution Order (Recommended)
1. Region selector + provider-by-region data path.
2. API route tests + provider fallback tests.
3. Error/retry UX improvements.
4. Feedback-based ranking loop.
5. Auth + persistence.
