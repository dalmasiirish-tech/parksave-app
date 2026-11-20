import { pgTable, uuid, text, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";

// One row per parking session. A row with found_at = NULL is the device's active spot.
export const parkingSpots = pgTable(
  "parking_spots",
  {
    id: uuid().primaryKey().defaultRandom(),
    deviceId: text("device_id").notNull(),
    building: text().notNull().default(""),
    level: text().notNull().default(""),
    slot: text().notNull().default(""),
    note: text().notNull().default(""),
    photoKey: text("photo_key"),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    accuracy: doublePrecision(),
    parkedAt: timestamp("parked_at", { withTimezone: true }).notNull().defaultNow(),
    foundAt: timestamp("found_at", { withTimezone: true }),
  },
  (t) => [index("parking_spots_device_idx").on(t.deviceId, t.parkedAt)],
);

export type ParkingSpot = typeof parkingSpots.$inferSelect;
