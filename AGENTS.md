# AGENTS.md — ParkSave

Mobile-first parking spot saver (React + Vite frontend, Netlify Server API, Netlify Database + Blobs).

## Architecture

- `index.html`, `src/` — single-page React app (no router; two tabs: Park and History, plus bottom sheets).
  - `src/App.tsx` — layout, tabs, and orchestration of sheets/actions.
  - `src/components/` — `SaveButton` (hero button inside parking-bay lines), `ActiveSpotCard` ("Where did I park?" + timer), `DetailsSheet` (building/level/slot/photo/note form, used for create, edit and after-quick-save), `FindCarSheet` (distance, compass, map, Google Maps/Waze links), `FoundSheet` (confirm clear), `HistoryList`, `Sheet` (generic bottom sheet), `Toasts`.
  - `src/lib/store.ts` — the client store (`useSyncExternalStore`). Server is the source of truth, but state is cached in localStorage and offline actions are queued (`create` / `found`) and flushed on reconnect. Local-only spots have ids prefixed `local-`.
  - `src/lib/api.ts` — fetch wrapper; sends `x-device-id`; throws `OfflineError` on network failure (callers fall back to the queue).
  - `src/lib/geo.ts`, `format.ts`, `image.ts`, `toast.ts`, `useNow.ts` — helpers.
- `netlify/server/index.ts` — the only server entry (Hono, `config.path = "/api/*"`). Routes: `GET/POST /api/spots`, `PATCH/DELETE /api/spots/:id`, `POST /api/spots/:id/found`, `POST /api/photos`, `GET /api/photos/:key`.
- `db/schema.ts`, `db/index.ts` — Drizzle schema/client (`drizzle-orm/netlify-db`). Migrations live in `netlify/database/migrations/` (generated with `drizzle-kit generate --name ...`; never hand-edit applied ones).
- Static build output: `dist/` (see `netlify.toml`). There is no catch-all rewrite, so `/api/*` reaches the server.

## Key decisions

- **No accounts.** A random UUID device ID in localStorage scopes all rows (`parking_spots.device_id`). Photos are served by unguessable UUID key so `<img>` tags work without headers.
- **One active spot per device** = row with `found_at IS NULL`. Creating a new spot closes the previous one.
- **Offline-first for basements.** `POST /api/spots` accepts `parkedAt` and `foundAt` (validated to the last 7 days) so queued offline saves sync with their real times; a create with `foundAt` goes straight into history without closing the active spot.
- Photos are compressed client-side (≤1400px JPEG); offline photos are kept as data URLs (≤900px) in the queue until upload.

## Conventions

- Tailwind v4 theme tokens in `src/styles.css` (`cream`, `linen`, `sand`, `nude`, `peach*`, `clay`, `brown`, `cocoa`, `espresso`, `ink`). Keep the nude-brown/peach palette; no pure black.
- Big touch targets (≥56px for primary actions), 17px inputs (prevents iOS zoom), Philippine touches (en-PH formatting, Tagalog greetings, PH mall suggestions).
- Server code imports with `.js` extensions; keep a single file in `netlify/server/`.
