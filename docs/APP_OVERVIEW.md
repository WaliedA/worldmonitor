# World Monitor — App Overview

Short summary

- World Monitor is a client-side SPA (TypeScript + Vite) that aggregates real-time news, market data, geospatial assets, and signals into an interactive global dashboard.

Running locally ✅

- Dev server: `npm run dev` (Vite, default port 5173)
- Build: `npm run build` (runs `tsc` then `vite build`)
- Preview build: `npm run preview`
- Optional local AIS relay: `node scripts/ais-relay.cjs` (set `AISSTREAM_API_KEY` or `VITE_AISSTREAM_API_KEY`)
- Important env vars: `FINNHUB_API_KEY`, `VITE_WS_RELAY_URL`, `VITE_OPENSKY_RELAY_URL`, `CLOUDFLARE_API_TOKEN`, `ACLED_ACCESS_TOKEN` (README lists details)

Architecture & key components 🔧

- Entry: `src/main.ts` → `src/App.ts` (orchestrator, panel setup, refresh/snapshot logic)
- UI: `src/components/` (panels, `Map.ts`, modals, virtual lists)
- Data services: `src/services/` (RSS, markets, earthquakes, flights, AIS, clustering, correlation)
- Worker: `src/workers/analysis.worker.ts` runs clustering/correlation off the main thread; core algorithms live in `src/services/analysis-core.ts`
- Serverless/Edge proxies: `api/*.js` — used for safe cross-origin fetches, validation, throttling and caching (e.g., `api/rss-proxy.js`, `api/coingecko.js`)
- Storage: UI state → `localStorage` (`src/config/panels.ts`), historical baselines & snapshots → IndexedDB (`src/services/storage.ts`)

Data & integration patterns 🔗

- RSS feeds are proxied via `api/rss-proxy.js` and listed in `src/config/feeds.ts` (domains whitelist enforced)
- Live AIS & military tracking use a WebSocket relay configured via `VITE_WS_RELAY_URL`; dev mode uses a local relay (`scripts/ais-relay.cjs`)
- Circuit breakers (`src/utils/circuit-breaker.ts`) wrap unstable external APIs to provide caching and cooldown behavior; check `getCircuitBreakerStatus()` for health
- Worker IPC: messages are JSON-serializable; dates are serialized and re-hydrated on receipt (see `src/workers/analysis.worker.ts` for message shapes)

Conventions & quick rules 🧭

- Path alias: `@/*` → `src/*` (see `tsconfig.json`) — use it for imports
- TypeScript: `strict: true`; changes should compile cleanly (`npm run build`)
- Keep UI (components) separate from data logic (`src/services/*`) and put pure, test-friendly functions in `*-core` modules when possible
- Edge API handlers must validate inputs, set CORS (`Access-Control-Allow-Origin: *`) and add `Cache-Control` headers

Common change examples ✍️

- Add an RSS feed: add entry in `src/config/feeds.ts` and, if the feed host is external, ensure hostname is included in the `ALLOWED_DOMAINS` list in `api/rss-proxy.js`.
- Add a heavy algorithm: implement pure functions in `src/services/your-core.ts`, unit test locally, then call from `src/workers/analysis.worker.ts` to offload CPU.
- Add an API proxy: create `api/your-endpoint.js` exporting `default` (handler) and optionally `export const config = { runtime: 'edge' }`.

Debugging tips 🐞

- Open browser devtools: console logs include map events, worker messages, and circuit-breaker warnings.
- Worker issues: open the `src/workers/analysis.worker.ts` message handler and add logging; inspect messages posted back to the main thread.
- Circuit breaker: inspect status via `getCircuitBreakerStatus()` when upstreams are flaky; cached data will be returned while on cooldown.

Where to look first (recommended files)

- `README.md` — project overview & env table
- `src/App.ts` — orchestration and UI wiring
- `src/services/*` — data ingestion & transformation
- `src/workers/analysis.worker.ts` and `src/services/analysis-core.ts` — clustering and correlation logic
- `api/rss-proxy.js`, `api/coingecko.js` — patterns for input validation and timeouts

PR / contribution guidance

- Keep changes small and focused; prefer adding typed pure functions and small exported helpers
- When changing runtime behavior (new cron-like fetches, added snapshot keys, new persistent storage), document the change and include reasoning in PR description

If you want this file expanded into a developer guide (deploy steps, worker message examples, data schema reference), tell me which area to expand and I will iterate. ✅
