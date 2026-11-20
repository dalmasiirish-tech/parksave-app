import { useState } from "react";
import { ChevronDown, Clock3, CloudOff, History, MapPin, NotebookPen, Trash2 } from "lucide-react";
import { clockTime, dayLabel, shortDuration, spotTitle } from "../lib/format";
import { directionLinks } from "../lib/geo";
import type { Spot } from "../lib/types";

interface Props {
  history: Spot[];
  loading: boolean;
  onDelete: (spot: Spot) => Promise<void>;
  onPhoto: (url: string) => void;
}

const duration = (s: Spot) => (s.foundAt ? new Date(s.foundAt).getTime() - new Date(s.parkedAt).getTime() : 0);

function Stats({ history }: { history: Spot[] }) {
  const total = history.reduce((sum, s) => sum + duration(s), 0);
  const counts = new Map<string, number>();
  history.forEach((s) => s.building && counts.set(s.building, (counts.get(s.building) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-3">
      <div className="rounded-3xl bg-espresso p-4 text-cream">
        <p className="text-[11px] font-bold tracking-[0.18em] text-peach uppercase">Spots saved</p>
        <p className="font-display text-4xl font-semibold">{history.length}</p>
      </div>
      <div className="rounded-3xl bg-peach-soft p-4 text-espresso">
        <p className="text-[11px] font-bold tracking-[0.18em] text-cocoa uppercase">Avg. stay</p>
        <p className="font-display text-4xl font-semibold">{shortDuration(total / history.length)}</p>
      </div>
      {top && (
        <div className="col-span-2 flex items-center gap-3 rounded-3xl bg-linen px-4 py-3 ring-1 ring-sand">
          <MapPin className="size-5 shrink-0 text-clay" />
          <p className="min-w-0 truncate text-[15px] text-brown">
            Most visited: <strong className="font-bold text-cocoa">{top[0]}</strong> · {top[1]}×
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryItem({ spot, onDelete, onPhoto }: { spot: Spot; onDelete: Props["onDelete"]; onPhoto: Props["onPhoto"] }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const details = [spot.level && `Level ${spot.level}`, spot.slot && `Slot ${spot.slot}`].filter(Boolean).join(" · ");
  const hasGps = spot.latitude != null && spot.longitude != null;

  async function remove() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    try {
      await onDelete(spot);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-3xl bg-cream shadow-soft ring-1 ring-sand">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-sand">
          {spot.photoUrl ? (
            <img src={spot.photoUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="font-display text-xl font-bold text-brown">{spot.level || "P"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-ink">{spotTitle(spot)}</p>
          {details && spot.building && <p className="truncate text-[14px] font-semibold text-cocoa">{details}</p>}
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-brown">
            <Clock3 className="size-3.5" />
            {clockTime(spot.parkedAt)} · {shortDuration(duration(spot))}
            {spot.pending && <CloudOff className="ml-1 size-3.5 text-clay" aria-label="Waiting to sync" />}
          </p>
        </div>
        <ChevronDown className={`size-5 shrink-0 text-clay transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="animate-fade space-y-3 border-t border-dashed border-nude px-3 pt-3 pb-3">
          {spot.photoUrl && (
            <button onClick={() => onPhoto(spot.photoUrl!)} className="block w-full overflow-hidden rounded-2xl">
              <img src={spot.photoUrl} alt="Photo of the parking spot" className="max-h-52 w-full object-cover" />
            </button>
          )}
          {spot.note && (
            <p className="flex gap-2 text-[15px] text-cocoa">
              <NotebookPen className="mt-0.5 size-4 shrink-0 text-clay" />
              {spot.note}
            </p>
          )}
          <p className="text-[14px] text-brown">
            Parked {clockTime(spot.parkedAt)}
            {spot.foundAt && ` → found ${clockTime(spot.foundAt)}`}
          </p>
          <div className="flex gap-2">
            {hasGps && (
              <a
                href={directionLinks(spot.latitude!, spot.longitude!).google}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-linen text-[15px] font-bold text-cocoa ring-1 ring-sand"
              >
                <MapPin className="size-4" /> Open in Maps
              </a>
            )}
            <button
              onClick={remove}
              disabled={busy}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl px-4 text-[15px] font-bold transition ${
                confirming ? "flex-1 bg-rose text-cream" : "bg-linen text-rose ring-1 ring-sand"
              } ${hasGps ? "" : "flex-1"}`}
            >
              <Trash2 className="size-4" /> {confirming ? "Tap again to delete" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function HistoryList({ history, loading, onDelete, onPhoto }: Props) {
  if (loading && history.length === 0) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 rounded-3xl bg-cream p-3 ring-1 ring-sand">
            <div className="size-16 rounded-2xl bg-sand" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-sand" />
              <div className="h-3 w-1/3 rounded-full bg-sand" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] border-2 border-dashed border-nude bg-linen/50 px-6 py-12 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-sand">
          <History className="size-8 text-clay" />
        </div>
        <p className="mt-4 font-display text-2xl font-semibold text-ink">No past parks yet</p>
        <p className="mt-1 max-w-[16rem] text-[15px] text-brown">After you tap “I Found My Car”, the spot lands here so you can look back.</p>
      </div>
    );
  }

  const groups: { day: string; spots: Spot[] }[] = [];
  history.forEach((s) => {
    const day = dayLabel(s.parkedAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.spots.push(s);
    else groups.push({ day, spots: [s] });
  });

  return (
    <div className="space-y-6">
      <Stats history={history} />
      {groups.map((g) => (
        <section key={g.day}>
          <h3 className="mb-2 px-1 text-xs font-bold tracking-[0.18em] text-clay uppercase">{g.day}</h3>
          <ul className="space-y-2.5">
            {g.spots.map((s) => (
              <HistoryItem key={s.id} spot={s} onDelete={onDelete} onPhoto={onPhoto} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
