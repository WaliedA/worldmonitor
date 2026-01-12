# Copilot / AI Agent Instructions for World Monitor

Purpose: Give short, actionable guidance so an AI coding agent can be productive quickly in this repo.

Quick start
- Dev server: `npm run dev` (Vite, default port 5173).
- Build: `npm run build` (runs `tsc` for type checks then `vite build`).
- Preview a build: `npm run preview`.
- Local AIS relay (dev): `node scripts/ais-relay.cjs` with `AISSTREAM_API_KEY` env var (or `VITE_AISSTREAM_API_KEY`).

Architecture & where to look first
- Frontend SPA: TypeScript + Vite. Entry: `src/main.ts` → `src/App.ts`.
- UI: `src/components/` contains panels, `Map.ts` and modal components.
- Data & business logic: `src/services/` (RSS, markets, earthquakes, AIS, flights, correlation, storage, etc.).
- Worker: `src/workers/analysis.worker.ts` runs CPU-heavy clustering/correlation logic; core algorithms live in `src/services/analysis-core.ts`.
- Config & static data: `src/config/` (feeds, geo assets, panels) and `data/` for static JSON.
- Serverless proxies / edge functions: `api/*.js` (Edge runtime handlers that return `Response` objects, set CORS and Cache-Control).
- Utilities & patterns: `src/utils/` (circuit breaker, proxy helpers, IndexedDB helpers, storage wrappers).

Important repo conventions
- Path alias: `@/*` -> `src/*` (see `tsconfig.json`). Use this when importing.
- TypeScript: `strict: true` with many safety flags; `npm run build` runs `tsc` for type checks — keep types tight and explicit.
- Circuit breaker pattern: use `createCircuitBreaker` (`src/utils/circuit-breaker.ts`) for unstable upstreams — services consume `breaker.execute(...)` and expose status via `getCircuitBreakerStatus()`.
- Worker protocol: Worker message shapes are explicit (see `src/workers/analysis.worker.ts`). Post/receive JSON-serializable messages and deserialize dates on receipt.
- Storage: short-term snapshots & baselines stored in IndexedDB (`src/services/storage.ts`); UI state in `localStorage` with keys in `src/config/panels.ts (STORAGE_KEYS)`.
- API proxies: `api/*.js` follow a pattern — validate inputs, whitelist domains when necessary (`rss-proxy.js`), use `fetch` with timeouts and return a `Response` with `Access-Control-Allow-Origin: *` and `Cache-Control` headers.

How to add common changes (examples)
- Add an RSS feed: edit `src/config/feeds.ts` under the appropriate category and ensure the feed host is whitelisted in `api/rss-proxy.js` if it needs proxying.
- Add a new edge proxy: add `api/your-endpoint.js` exporting `default` (handler) and optionally `export const config = { runtime: 'edge' }`. Follow patterns in `coingecko.js` and `rss-proxy.js` (validate params, set cache headers and CORS).
- Add a heavy calculation: put core logic into `src/services/your-core.ts` and call it from `src/workers/analysis.worker.ts` so the main thread remains responsive.

Environment & feature flags
- Optional env vars (features are hidden if absent): `FINNHUB_API_KEY`, `VITE_WS_RELAY_URL` (AIS), `VITE_OPENSKY_RELAY_URL` (OpenSky proxy), `CLOUDFLARE_API_TOKEN`, `ACLED_ACCESS_TOKEN`.
- AIS dev flow: when `VITE_WS_RELAY_URL` is unset, `isAisConfigured()` returns `true` on `localhost` to ease development. For production, deploy `scripts/ais-relay.cjs` (Railway) or set a relay URL.

Testing & CI
- No test framework present. `npm run build` performs type-time checks. Keep PRs small and type-sound.

Debugging tips
- Run `npm run dev` and open browser console for runtime logs (Map, Worker messages, circuit breaker warnings).
- AIS relay health: `http://localhost:3004/health` (when running `scripts/ais-relay.cjs`).
- Reproducible flaky upstreams: inspect `getCircuitBreakerStatus()` via code or call patterns and check cache/ cooldown behavior.

Style / PR guidance for AI agents
- Preserve existing abstractions: UI (components) vs data (services) vs config.
- Prefer adding new logic in `src/services/*` with small, well-typed exports; add unit-friendly pure functions to `*-core` modules when appropriate to allow future workerization.
- When adding APIs under `api/`, follow validation and timeout patterns and ensure explicit cache headers.
- Keep changes minimal and well-scoped — large refactors should include a walk-through in the PR description.

Files to review for context
- `README.md` (project overview & environment var table)
- `src/App.ts` (application orchestration)
- `src/services/*` (data ingestion & analysis)
- `src/workers/analysis.worker.ts` (worker messaging protocol)
- `api/rss-proxy.js`, `api/coingecko.js` (proxy patterns)
- `scripts/ais-relay.cjs` (AIS relay dev/prod proxy)

If anything in this guide is unclear or you'd like more/less detail, tell me which areas to expand (deploy, data schema, worker messaging examples, or test suggestions) and I'll iterate. ✅
