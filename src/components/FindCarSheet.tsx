import { useEffect, useState } from "react";
import { Compass, ExternalLink, LocateFixed, MapPinOff, NotebookPen } from "lucide-react";
import { bearingDegrees, cardinal, directionLinks, distanceMeters, formatDistance } from "../lib/geo";
import { clockTime } from "../lib/format";
import type { Coords, Spot } from "../lib/types";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  spot: Spot;
  onClose: () => void;
  onFound: () => void;
}

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

function useLivePosition(enabled: boolean) {
  const [pos, setPos] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => err.code === err.PERMISSION_DENIED && setDenied(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return { pos, denied };
}

function useCompass(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(
    () => typeof window !== "undefined" && typeof (window.DeviceOrientationEvent as unknown as OrientationPermission)?.requestPermission === "function",
  );

  useEffect(() => {
    if (!enabled || needsPermission) return;
    const onOrient = (e: Event) => {
      const ev = e as OrientationEventWithCompass;
      if (typeof ev.webkitCompassHeading === "number") setHeading(ev.webkitCompassHeading);
      else if (ev.absolute && ev.alpha != null) setHeading((360 - ev.alpha) % 360);
    };
    window.addEventListener("deviceorientationabsolute", onOrient);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [enabled, needsPermission]);

  async function enable() {
    try {
      const result = await (window.DeviceOrientationEvent as unknown as OrientationPermission).requestPermission?.();
      if (result === "granted") setNeedsPermission(false);
    } catch {
      /* user declined */
    }
  }

  return { heading, needsPermission, enable };
}

export function FindCarSheet({ open, spot, onClose, onFound }: Props) {
  const hasGps = spot.latitude != null && spot.longitude != null;
  const { pos, denied } = useLivePosition(open && hasGps);
  const { heading, needsPermission, enable } = useCompass(open && hasGps);
  const car = hasGps ? { latitude: spot.latitude!, longitude: spot.longitude! } : null;
  const links = car ? directionLinks(car.latitude, car.longitude) : null;

  const distance = pos && car ? distanceMeters(pos, car) : null;
  const bearing = pos && car ? bearingDegrees(pos, car) : null;
  const arrowRotation = bearing == null ? 0 : heading == null ? bearing : bearing - heading;
  const close = distance != null && distance < Math.max(15, (pos?.accuracy ?? 0) * 0.8);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={`Parked at ${clockTime(spot.parkedAt)}`}
      title="Find my car"
      footer={
        <button
          onClick={onFound}
          className="h-16 w-full rounded-[1.4rem] border-2 border-peach-deep bg-peach-soft text-lg font-extrabold text-espresso transition active:scale-[0.98]"
        >
          I Found My Car
        </button>
      }
    >
      <div className="space-y-4 pb-2">
        {(spot.level || spot.slot || spot.building) && (
          <div className="flex items-stretch gap-2 rounded-3xl bg-espresso p-2 text-cream">
            {spot.level && (
              <div className="flex-1 rounded-2xl bg-cocoa px-4 py-3">
                <p className="text-[11px] font-bold tracking-[0.18em] text-peach uppercase">Level</p>
                <p className="font-display text-4xl font-bold">{spot.level}</p>
              </div>
            )}
            {spot.slot && (
              <div className="flex-1 rounded-2xl bg-cocoa px-4 py-3">
                <p className="text-[11px] font-bold tracking-[0.18em] text-peach uppercase">Slot</p>
                <p className="font-display text-4xl font-bold break-all">{spot.slot}</p>
              </div>
            )}
            {!spot.level && !spot.slot && <p className="px-4 py-3 font-display text-2xl font-semibold">{spot.building}</p>}
          </div>
        )}

        {car && links ? (
          <>
            <div className="flex items-center gap-4 rounded-3xl bg-linen p-4 ring-1 ring-sand">
              <div className="relative grid size-24 shrink-0 place-items-center rounded-full bg-cream shadow-soft ring-1 ring-sand">
                <span className="absolute top-1.5 text-[10px] font-extrabold text-clay">N</span>
                {bearing == null ? (
                  <LocateFixed className="size-9 animate-pulse text-clay" />
                ) : (
                  <svg viewBox="0 0 48 48" className="size-14 transition-transform duration-500" style={{ transform: `rotate(${arrowRotation}deg)` }} aria-hidden>
                    <path d="M24 4 38 40 24 32 10 40Z" fill="var(--color-peach-deep)" stroke="var(--color-espresso)" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                {distance == null ? (
                  <>
                    <p className="font-display text-2xl font-semibold text-ink">{denied ? "Location is off" : "Finding you…"}</p>
                    <p className="text-[15px] text-brown">{denied ? "Turn on location to see distance." : "Hold your phone flat for a moment."}</p>
                  </>
                ) : close ? (
                  <>
                    <p className="font-display text-3xl font-semibold text-ink">You're close!</p>
                    <p className="text-[15px] text-brown">Your car is within about {formatDistance(distance)}.</p>
                  </>
                ) : (
                  <>
                    <p className="tabular font-display text-4xl font-semibold text-ink">{formatDistance(distance)}</p>
                    <p className="text-[15px] text-brown">
                      Walk {cardinal(bearing!)}
                      {heading == null ? " · arrow points from north" : " · follow the arrow"}
                    </p>
                  </>
                )}
                {needsPermission && (
                  <button onClick={enable} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-full bg-sand px-3.5 text-sm font-bold text-cocoa">
                    <Compass className="size-4" /> Turn on compass
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl bg-sand ring-1 ring-sand">
              <iframe title="Map of your parked car" src={links.embed} className="h-56 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={links.google}
                target="_blank"
                rel="noreferrer"
                className="flex h-16 items-center justify-center gap-2 rounded-[1.4rem] bg-espresso text-[17px] font-extrabold text-cream shadow-soft transition active:scale-[0.97]"
              >
                Google Maps <ExternalLink className="size-4 text-peach" />
              </a>
              <a
                href={links.waze}
                target="_blank"
                rel="noreferrer"
                className="flex h-16 items-center justify-center gap-2 rounded-[1.4rem] bg-cocoa text-[17px] font-extrabold text-cream shadow-soft transition active:scale-[0.97]"
              >
                Waze <ExternalLink className="size-4 text-peach" />
              </a>
            </div>
            <p className="text-center text-sm text-brown">GPS is weak in basements — use the level and slot above once you're inside the building.</p>
          </>
        ) : (
          <div className="flex gap-3 rounded-3xl bg-linen p-4 ring-1 ring-sand">
            <MapPinOff className="mt-0.5 size-6 shrink-0 text-clay" />
            <div>
              <p className="font-bold text-ink">No GPS was saved for this spot</p>
              <p className="text-[15px] text-brown">Head back to the building above and follow the level and slot. Your photo and note can help too.</p>
            </div>
          </div>
        )}

        {spot.photoUrl && <img src={spot.photoUrl} alt="Photo of the parking spot" className="max-h-72 w-full rounded-3xl object-cover" />}
        {spot.note && (
          <p className="flex gap-2 rounded-3xl bg-linen p-4 text-[16px] leading-snug text-cocoa ring-1 ring-sand">
            <NotebookPen className="mt-0.5 size-5 shrink-0 text-clay" />
            {spot.note}
          </p>
        )}
      </div>
    </Sheet>
  );
}
