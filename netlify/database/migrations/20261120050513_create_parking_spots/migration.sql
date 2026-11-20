CREATE TABLE "parking_spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"device_id" text NOT NULL,
	"building" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"slot" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"photo_key" text,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	"parked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"found_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "parking_spots_device_idx" ON "parking_spots" ("device_id","parked_at");