import { Building2, CarFront, CloudOff, MapPin, MapPinOff, Navigation, NotebookPen, PencilLine } from "lucide-react";
import { clockTime, dayLabel } from "../lib/format";
import type { Spot } from "../lib/types";
import { ParkedTimer } from "./ParkedTimer";

interface Props {
  spot: Spot;
  onFind: () => void;
  onFound: () => void;
  onEdit: () => void;
  onPhoto: () => void;
}

function Tile({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  if (!value) {
    return (
      <button
        onClick={onEdit}
        className="flex min-h-[7.5rem] flex-col justify-between rounded-3xl border-2 border-dashed border-nude bg-linen/60 p-4 text-left transition active:scale-[0.97]"
      >
        <span className="text-xs font-bold tracking-[0.18em] text-clay uppercase">{label}</span>
        <span className="text-[15px] font-semibold text-brown">+ Add {label.toLowerCase()}</span>
      </button>
    );
  }
  return (
    <div className="flex min-h-[7.5rem] flex-col justify-between rounded-3xl bg-espresso p-4 text-cream">
      <span className="text-xs font-bold tracking-[0.18em] text-peach uppercase">{label}</span>
      <span className="font-display text-[clamp(2.2rem,11vw,3.2rem)] leading-none font-bold break-all text-cream">{value}</span>
    </div>
  );
}

export function ActiveSpotCard({ spot, onFind, onFound, onEdit, onPhoto }: Props) {
  const hasGps = spot.latitude != null && spot.longitude != null;
  return (
    <section className="animate-rise space-y-4" aria-labelledby="where-title">
      <div className="rounded-[2rem] bg-cream/90 p-5 shadow-lift ring-1 ring-sand">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id="where-title" className="text-xs font-bold tracking-[0.18em] text-clay uppercase">
              Where did I park?
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-[1.75rem] leading-tight font-semibold text-ink">
              {spot.building ? (
                <>
                  <Building2 className="size-6 shrink-0 text-brown" />
                  <span className="truncate">{spot.building}</span>
                </>
              ) : (
                <span className="text-brown">Your car is here</span>
              )}
            </h2>
          </div>
          <button
            onClick={onEdit}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-sand px-4 text-sm font-bold text-cocoa transition active:scale-95"
          >
            <PencilLine className="size-4" /> Edit
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Tile label="Level" value={spot.level} onEdit={onEdit} />
          <Tile label="Slot" value={spot.slot} onEdit={onEdit} />
        </div>

        {(spot.photoUrl || spot.note) && (
          <div className="mt-3 flex gap-3 rounded-3xl bg-linen p-3">
            {spot.photoUrl && (
              <button onClick={onPhoto} className="size-20 shrink-0 overflow-hidden rounded-2xl bg-sand transition active:scale-95" aria-label="View photo">
                <img src={spot.photoUrl} alt="Photo of the parking spot" className="size-full object-cover" />
              </button>
            )}
            {spot.note && (
              <p className="flex min-w-0 gap-2 self-center text-[15px] leading-snug text-cocoa">
                <NotebookPen className="mt-0.5 size-4 shrink-0 text-clay" />
                <span className="break-words">{spot.note}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-dashed border-nude pt-5">
          <p className="text-xs font-bold tracking-[0.18em] text-clay uppercase">Parked for</p>
          <ParkedTimer since={spot.parkedAt} />
          <p className="text-[15px] text-brown">
            Since <strong className="font-bold text-cocoa">{clockTime(spot.parkedAt)}</strong> · {dayLabel(spot.parkedAt)}
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${
                hasGps ? "bg-sage/15 text-sage" : "bg-sand text-brown"
              }`}
            >
              {hasGps ? <MapPin className="size-3.5" /> : <MapPinOff className="size-3.5" />}
              {hasGps ? `GPS saved${spot.accuracy ? ` · ±${Math.round(spot.accuracy)} m` : ""}` : "No GPS — use level & slot"}
            </span>
            {spot.pending && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-soft px-3 py-1.5 text-[13px] font-bold text-cocoa">
                <CloudOff className="size-3.5" /> Saved on phone · syncs when online
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onFind}
        className="flex h-[4.5rem] w-full items-center justify-center gap-3 rounded-[1.6rem] bg-espresso text-xl font-extrabold text-cream shadow-lift transition active:scale-[0.98]"
      >
        <Navigation className="size-6 fill-peach text-peach" /> Find My Car
      </button>
      <button
        onClick={onFound}
        className="flex h-[4.5rem] w-full items-center justify-center gap-3 rounded-[1.6rem] border-2 border-peach-deep bg-peach-soft text-xl font-extrabold text-espresso transition active:scale-[0.98]"
      >
        <CarFront className="size-6" /> I Found My Car
      </button>
    </section>
  );
}
