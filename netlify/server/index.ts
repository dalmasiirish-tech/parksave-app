import { Hono } from "hono";
import { getStore } from "@netlify/blobs";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { parkingSpots, type ParkingSpot } from "../../db/schema.js";

// ParkSave has no accounts: each phone generates a random device ID (stored in
// localStorage) and sends it on every request. All data is scoped to that ID.
type Env = { Variables: { deviceId: string } };

const app = new Hono<Env>().basePath("/api");
const photos = getStore("parking-photos");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const coord = (value: unknown, limit: number) =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;

function toJson(spot: ParkingSpot) {
  return {
    id: spot.id,
    building: spot.building,
    level: spot.level,
    slot: spot.slot,
    note: spot.note,
    photoUrl: spot.photoKey ? `/api/photos/${spot.photoKey}` : null,
    photoKey: spot.photoKey,
    latitude: spot.latitude,
    longitude: spot.longitude,
    accuracy: spot.accuracy,
    parkedAt: spot.parkedAt.toISOString(),
    foundAt: spot.foundAt ? spot.foundAt.toISOString() : null,
  };
}

// Spots saved without signal sync later, so accept a client time within the past week.
function pastTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const time = new Date(value);
  const now = Date.now();
  if (Number.isNaN(time.getTime())) return null;
  if (time.getTime() > now + 5 * 60_000 || time.getTime() < now - 7 * 86_400_000) return null;
  return time;
}

function detailsFrom(body: Record<string, unknown>) {
  const details: Partial<typeof parkingSpots.$inferInsert> = {};
  if ("building" in body) details.building = clean(body.building, 120);
  if ("level" in body) details.level = clean(body.level, 40);
  if ("slot" in body) details.slot = clean(body.slot, 40);
  if ("note" in body) details.note = clean(body.note, 500);
  if ("photoKey" in body) {
    details.photoKey = typeof body.photoKey === "string" && UUID_RE.test(body.photoKey) ? body.photoKey : null;
  }
  if ("latitude" in body || "longitude" in body) {
    details.latitude = coord(body.latitude, 90);
    details.longitude = coord(body.longitude, 180);
    details.accuracy = coord(body.accuracy, 100000);
  }
  return details;
}

// Photos are served by unguessable key so plain <img> tags can load them.
app.get("/photos/:key", async (c) => {
  const key = c.req.param("key");
  if (!UUID_RE.test(key)) return c.notFound();
  const result = await photos.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) return c.notFound();
  return new Response(result.data, {
    headers: {
      "content-type": String(result.metadata?.contentType || "image/jpeg"),
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
});

app.use("*", async (c, next) => {
  const deviceId = c.req.header("x-device-id") ?? "";
  if (!UUID_RE.test(deviceId)) return c.json({ error: "Missing device ID" }, 400);
  c.set("deviceId", deviceId);
  await next();
});

app.post("/photos", async (c) => {
  const type = (c.req.header("content-type") ?? "").split(";")[0].trim();
  if (!PHOTO_TYPES.has(type)) return c.json({ error: "Please upload a JPG, PNG or WebP photo" }, 415);
  const data = await c.req.arrayBuffer();
  if (data.byteLength === 0) return c.json({ error: "Empty photo" }, 400);
  if (data.byteLength > MAX_PHOTO_BYTES) return c.json({ error: "Photo is too large" }, 413);
  const key = crypto.randomUUID();
  await photos.set(key, data, { metadata: { contentType: type } });
  return c.json({ key, url: `/api/photos/${key}` }, 201);
});

app.get("/spots", async (c) => {
  const deviceId = c.get("deviceId");
  const [active] = await db
    .select()
    .from(parkingSpots)
    .where(and(eq(parkingSpots.deviceId, deviceId), isNull(parkingSpots.foundAt)))
    .orderBy(desc(parkingSpots.parkedAt))
    .limit(1);
  const history = await db
    .select()
    .from(parkingSpots)
    .where(and(eq(parkingSpots.deviceId, deviceId), isNotNull(parkingSpots.foundAt)))
    .orderBy(desc(parkingSpots.parkedAt))
    .limit(60);
  return c.json({ active: active ? toJson(active) : null, history: history.map(toJson) });
});

app.post("/spots", async (c) => {
  const deviceId = c.get("deviceId");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const parkedAt = pastTime(body.parkedAt) ?? new Date();
  const foundAt = pastTime(body.foundAt);
  // A spot saved offline and already found syncs straight into history.
  if (foundAt) {
    const [spot] = await db
      .insert(parkingSpots)
      .values({ ...detailsFrom(body), deviceId, parkedAt, foundAt: foundAt.getTime() < parkedAt.getTime() ? parkedAt : foundAt })
      .returning();
    return c.json(toJson(spot), 201);
  }
  // Only one active spot per device: close out any previous one first.
  await db
    .update(parkingSpots)
    .set({ foundAt: parkedAt })
    .where(and(eq(parkingSpots.deviceId, deviceId), isNull(parkingSpots.foundAt)));
  const [spot] = await db
    .insert(parkingSpots)
    .values({ ...detailsFrom(body), deviceId, parkedAt })
    .returning();
  return c.json(toJson(spot), 201);
});

app.patch("/spots/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.notFound();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const details = detailsFrom(body);
  if (Object.keys(details).length === 0) return c.json({ error: "Nothing to update" }, 400);
  const where = and(eq(parkingSpots.id, id), eq(parkingSpots.deviceId, c.get("deviceId")));
  const [before] = await db.select({ photoKey: parkingSpots.photoKey }).from(parkingSpots).where(where);
  if (!before) return c.notFound();
  const [spot] = await db.update(parkingSpots).set(details).where(where).returning();
  if (!spot) return c.notFound();
  // Clean up a replaced or removed photo.
  if ("photoKey" in details && before.photoKey && before.photoKey !== spot.photoKey) await photos.delete(before.photoKey);
  return c.json(toJson(spot));
});

app.post("/spots/:id/found", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.notFound();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const [spot] = await db
    .update(parkingSpots)
    .set({ foundAt: pastTime(body.foundAt) ?? new Date() })
    .where(and(eq(parkingSpots.id, id), eq(parkingSpots.deviceId, c.get("deviceId")), isNull(parkingSpots.foundAt)))
    .returning();
  if (!spot) return c.notFound();
  return c.json(toJson(spot));
});

app.delete("/spots/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.notFound();
  const [spot] = await db
    .delete(parkingSpots)
    .where(and(eq(parkingSpots.id, id), eq(parkingSpots.deviceId, c.get("deviceId"))))
    .returning();
  if (!spot) return c.notFound();
  if (spot.photoKey) await photos.delete(spot.photoKey);
  return c.json({ ok: true });
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});

export const config = { path: "/api/*" };

export default app;
