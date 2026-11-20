import { useCallback, useEffect, useRef, useState } from "react";
import { Car, History, Keyboard, ShieldCheck, WifiOff } from "lucide-react";
import { ActiveSpotCard } from "./components/ActiveSpotCard";
import { DetailsSheet } from "./components/DetailsSheet";
import { FindCarSheet } from "./components/FindCarSheet";
import { FoundSheet } from "./components/FoundSheet";
import { HistoryList } from "./components/HistoryList";
import { SaveButton } from "./components/SaveButton";
import { Sheet } from "./components/Sheet";
import { Toasts } from "./components/Toasts";
import { greeting, shortDuration, spotTitle } from "./lib/format";
import { getPosition } from "./lib/geo";
import { foundCar, removeSpot, saveSpot, sync, updateSpot, useParking } from "./lib/store";
import { toast } from "./lib/toast";
import type { Coords, Spot, SpotDetails } from "./lib/types";

type Tab = "park" | "history";
type DetailsMode = "create" | "edit" | "after-save";

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

const detailsOf = (s: Spot): SpotDetails => ({
  building: s.building,
  level: s.level,
  slot: s.slot,
  note: s.note,
  photoKey: s.photoKey,
  photoUrl: s.photoUrl,
});

export default function App() {
  const { ready, active, history } = useParking();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>("park");
  const [busy, setBusy] = useState(false);
  const [detailsMode, setDetailsMode] = useState<DetailsMode | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [foundOpen, setFoundOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const manualPosition = useRef<Promise<Coords | null> | null>(null);

  useEffect(() => {
    void sync();
  }, []);

  const recentBuildings = Array.from(new Set(history.map((s) => s.building).filter(Boolean))).slice(0, 6);
  const lastPark = history[0];

  async function quickSave() {
    setBusy(true);
    try {
      const coords = await getPosition(10000);
      const { offline } = await saveSpot({}, coords);
      if (offline) toast("No signal — spot saved on your phone", "info");
      else if (!coords) toast("Saved! No GPS here — add your level & slot", "info");
      else toast("Parking spot saved", "success");
      setDetailsMode("after-save");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save your spot", "error");
    } finally {
      setBusy(false);
    }
  }

  function openManual() {
    manualPosition.current = getPosition(10000);
    setDetailsMode("create");
  }

  async function submitDetails(details: SpotDetails) {
    if (detailsMode === "create") {
      const coords = (await manualPosition.current) ?? null;
      const { offline } = await saveSpot(details, coords);
      toast(offline ? "No signal — spot saved on your phone" : "Parking spot saved", offline ? "info" : "success");
    } else if (active) {
      await updateSpot(active.id, details);
      toast("Details saved", "success");
    }
    setDetailsMode(null);
  }

  async function confirmFound() {
    await foundCar();
    setFoundOpen(false);
    setFindOpen(false);
    toast("Ingat sa biyahe! Spot moved to history.", "success");
  }

  const deleteSpot = useCallback(async (spot: Spot) => {
    try {
      await removeSpot(spot.id);
      toast("Removed from history");
    } catch (e) {
      toast(e instanceof Error && e.message !== "No signal" ? e.message : "No signal — try again later", "error");
    }
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <Toasts />

      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-[0.9rem] bg-espresso font-display text-2xl font-bold text-peach shadow-soft">P</span>
          <div>
            <p className="font-display text-[1.45rem] leading-none font-semibold text-ink">ParkSave</p>
            <p className="mt-0.5 text-[12px] font-semibold text-clay">{greeting()}!</p>
          </div>
        </div>
        {!online && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-2 text-[13px] font-bold text-cocoa">
            <WifiOff className="size-4" /> Offline
          </span>
        )}
      </header>

      <main className="flex-1 px-5 pt-3 pb-32">
        {tab === "park" ? (
          active ? (
            <ActiveSpotCard
              spot={active}
              onFind={() => setFindOpen(true)}
              onFound={() => setFoundOpen(true)}
              onEdit={() => setDetailsMode("edit")}
              onPhoto={() => active.photoUrl && setPhoto(active.photoUrl)}
            />
          ) : (
            <section className="flex flex-col">
              <div className="animate-rise">
                <h1 className="font-display text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-ink">
                  Just parked?
                  <span className="block text-brown italic">One tap, tapos na.</span>
                </h1>
                <p className="mt-3 max-w-[22rem] text-[16px] leading-snug text-brown">
                  We'll lock in your location and time. Add the level, slot, or a photo of the pillar if you like.
                </p>
              </div>

              <div className="mt-8 animate-rise [animation-delay:120ms]">
                <SaveButton onSave={quickSave} busy={busy} />
              </div>

              <button
                onClick={openManual}
                className="mt-10 flex h-16 animate-rise items-center justify-center gap-2.5 rounded-[1.4rem] bg-cream text-[17px] font-bold text-cocoa shadow-soft ring-1 ring-sand transition [animation-delay:200ms] active:scale-[0.98]"
              >
                <Keyboard className="size-5 text-clay" /> Type details manually
              </button>

              {lastPark ? (
                <button
                  onClick={() => setTab("history")}
                  className="mt-3 flex animate-rise items-center gap-3 rounded-[1.4rem] bg-linen/80 p-4 text-left ring-1 ring-sand [animation-delay:260ms]"
                >
                  <History className="size-5 shrink-0 text-clay" />
                  <span className="min-w-0 text-[15px] text-brown">
                    Last park: <strong className="font-bold text-cocoa">{spotTitle(lastPark)}</strong>
                    {lastPark.foundAt && ` · ${shortDuration(new Date(lastPark.foundAt).getTime() - new Date(lastPark.parkedAt).getTime())}`}
                  </span>
                </button>
              ) : (
                <p className="mt-4 flex animate-rise items-start gap-2 px-1 text-[14px] text-brown [animation-delay:260ms]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage" />
                  Works even in basements with no signal — your spot is kept on your phone and syncs later.
                </p>
              )}
            </section>
          )
        ) : (
          <section>
            <h1 className="mb-5 font-display text-[2.3rem] leading-none font-semibold tracking-tight text-ink">History</h1>
            <HistoryList history={history} loading={!ready} onDelete={deleteSpot} onPhoto={setPhoto} />
          </section>
        )}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-5 pt-2">
        <div className="grid grid-cols-2 gap-1.5 rounded-[1.6rem] bg-espresso p-1.5 shadow-lift">
          {(
            [
              { id: "park", label: active ? "My Car" : "Park", icon: Car },
              { id: "history", label: "History", icon: History },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex h-14 items-center justify-center gap-2 rounded-[1.2rem] text-[16px] font-extrabold transition ${
                tab === id ? "bg-peach text-espresso" : "text-nude active:bg-cocoa"
              }`}
            >
              <Icon className="size-5" />
              {label}
              {id === "history" && history.length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[12px] ${tab === id ? "bg-espresso/15" : "bg-cocoa text-peach"}`}>{history.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <DetailsSheet
        open={detailsMode !== null}
        mode={detailsMode ?? "create"}
        initial={detailsMode !== "create" && active ? detailsOf(active) : undefined}
        recentBuildings={recentBuildings}
        onClose={() => setDetailsMode(null)}
        onSubmit={submitDetails}
      />

      {active && (
        <>
          <FindCarSheet open={findOpen} spot={active} onClose={() => setFindOpen(false)} onFound={() => setFoundOpen(true)} />
          <FoundSheet open={foundOpen} spot={active} onClose={() => setFoundOpen(false)} onConfirm={confirmFound} />
        </>
      )}

      <Sheet open={photo !== null} onClose={() => setPhoto(null)} title="Spot photo">
        {photo && <img src={photo} alt="Photo of the parking spot" className="mb-4 w-full rounded-3xl object-contain" />}
      </Sheet>
    </div>
  );
}
