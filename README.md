# ParkSave

ParkSave is a mobile-first parking spot saver for drivers in the Philippines. One big tap saves where you parked — GPS location and time — and you can add the building, floor/level, slot number, a photo of the pillar sign, and a note. A "Where did I park?" card shows your spot with a live timer, **Find My Car** gives you distance, a direction arrow, a map, and walking directions (Google Maps or Waze), and **I Found My Car** clears the spot into your history.

## Features

- **Save My Parking Spot** — one tap captures location and time, then offers quick level chips (B3…Roof), slot number, photo and note.
- **Manual entry** — type building, level, slot, photo and note yourself (handy when GPS is weak).
- **Where did I park?** — big level/slot tiles, building, photo, note, time parked and a live parked-for timer.
- **Find My Car** — live distance and compass arrow, embedded map, Google Maps / Waze walking directions.
- **I Found My Car** — confirms, then moves the spot to history.
- **History** — previous spots grouped by day, with stats, photos, map links and delete.
- **Works in basements** — the last state is cached on the phone; saves and "found" taps made without signal sync automatically when back online.

There are no accounts: each phone gets a random device ID, and all spots and photos are scoped to it.

## Tech

- **Frontend:** React 19 + Vite, Tailwind CSS v4, lucide-react icons, Fraunces + Plus Jakarta Sans fonts.
- **API:** a Netlify Server (Hono) at `netlify/server/index.ts`, serving `/api/*`.
- **Data:** Netlify Database (Postgres) via Drizzle ORM — schema in `db/schema.ts`, migrations in `netlify/database/migrations/`.
- **Photos:** Netlify Blobs (`parking-photos` store), compressed on the phone before upload.

## Running locally

```bash
npm install
netlify dev --port 8889
```

`netlify dev` runs the Vite frontend together with the Netlify Server and emulates Netlify Database and Blobs. Open http://localhost:8889 — geolocation needs `localhost` or HTTPS.

After changing `db/schema.ts`, generate a migration:

```bash
npx drizzle-kit generate --name <describe_change>
```

Migrations are applied automatically on deploy.
