import { useSyncExternalStore } from "react";
import { api, OfflineError } from "./api";
import { dataUrlToBlob } from "./image";
import type { Coords, Spot, SpotDetails } from "./types";

/**
 * Client-side parking store. The server (Netlify Database) is the source of truth,
 * but the last known state is cached on the phone so the saved spot still shows in a
 * basement with no signal. Saves and "found" taps made offline are queued and synced
 * as soon as the phone is back online.
 */

type QueueItem = { type: "create"; spot: Spot } | { type: "found"; id: string; foundAt: string };

interface State {
  ready: boolean;
  active: Spot | null;
  history: Spot[];
  queue: QueueItem[];
}

const CACHE_KEY = "parksave:cache:v1";

function readCache(): State {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...JSON.parse(raw), ready: false };
  } catch {
    /* ignore corrupt cache */
  }
  return { ready: false, active: null, history: [], queue: [] };
}

let state: State = readCache();
const listeners = new Set<() => void>();

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  const { ready: _ready, ...persisted } = state;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(persisted));
  } catch {
    /* storage full: keep working in memory */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useParking() {
  return useSyncExternalStore(subscribe, () => state);
}

const byNewest = (a: Spot, b: Spot) => b.parkedAt.localeCompare(a.parkedAt);
const isLocal = (id: string) => id.startsWith("local-");

let syncing: Promise<void> | null = null;
// Bumped by every user action so a slow refresh never overwrites a newer local change.
let mutations = 0;

const sameItem = (a: QueueItem, b: QueueItem) =>
  a.type === b.type && (a.type === "create" ? a.spot.id === (b as typeof a).spot.id : a.id === (b as typeof a).id);

let flushing: Promise<boolean> | null = null;

/** Sends queued offline changes one at a time. Resolves false if still offline. */
function flushQueue(): Promise<boolean> {
  flushing ??= doFlush().finally(() => (flushing = null));
  return flushing;
}

async function doFlush() {
  while (state.queue.length) {
    const item = state.queue[0];
    try {
      if (item.type === "create") {
        const { spot } = item;
        let photoKey = spot.photoKey;
        if (spot.photoUrl?.startsWith("data:")) {
          photoKey = (await api.uploadPhoto(await dataUrlToBlob(spot.photoUrl))).key;
        }
        const created = await api.create({
          building: spot.building,
          level: spot.level,
          slot: spot.slot,
          note: spot.note,
          photoKey,
          latitude: spot.latitude ?? undefined,
          longitude: spot.longitude ?? undefined,
          accuracy: spot.accuracy ?? undefined,
          parkedAt: spot.parkedAt,
          foundAt: spot.foundAt ?? undefined,
        });
        // The car may have been marked found while this upload was in flight.
        const latest = state.queue.find((q) => sameItem(q, item));
        if (!spot.foundAt && latest?.type === "create" && latest.spot.foundAt) {
          await api.found(created.id, latest.spot.foundAt);
        }
      } else {
        await api.found(item.id, item.foundAt).catch((e) => {
          if (e instanceof OfflineError) throw e; // already found / deleted elsewhere: drop it
        });
      }
    } catch (e) {
      if (e instanceof OfflineError) return false;
      console.error("Dropping unsyncable change", e);
    }
    setState({ queue: state.queue.filter((q) => !sameItem(q, item)) });
  }
  return true;
}

/** Push queued offline changes, then pull the latest spots from the server. */
export function sync(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const flushed = await flushQueue();
      if (!flushed) return;
      const before = mutations;
      const { active, history } = await api.list();
      if (before === mutations && state.queue.length === 0) setState({ active, history });
    } catch {
      /* offline: keep showing the cached state */
    } finally {
      setState({ ready: true });
      syncing = null;
    }
  })();
  return syncing;
}

function retireActive(foundAt: string) {
  const prev = state.active;
  if (!prev) return;
  const history = [{ ...prev, foundAt }, ...state.history].sort(byNewest);
  setState({ active: null, history });
}

export async function saveSpot(details: Partial<SpotDetails>, coords: Coords | null): Promise<{ spot: Spot; offline: boolean }> {
  mutations += 1;
  const now = new Date().toISOString();
  const prev = state.active;
  const payload = {
    building: details.building ?? "",
    level: details.level ?? "",
    slot: details.slot ?? "",
    note: details.note ?? "",
    photoKey: details.photoKey ?? null,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    accuracy: coords?.accuracy,
  };
  try {
    if (details.photoUrl?.startsWith("data:")) throw new OfflineError("Photo still waiting for signal");
    const hadQueue = state.queue.length > 0;
    if (hadQueue && !(await flushQueue())) throw new OfflineError("No signal");
    const spot = await api.create(payload);
    if (prev) retireActive(now);
    setState({ active: spot });
    if (hadQueue) void sync(); // swap synced local copies for their server versions
    return { spot, offline: false };
  } catch (e) {
    if (!(e instanceof OfflineError)) throw e;
    const spot: Spot = {
      id: `local-${crypto.randomUUID()}`,
      ...payload,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      accuracy: coords?.accuracy ?? null,
      photoUrl: details.photoUrl ?? null,
      parkedAt: now,
      foundAt: null,
      pending: true,
    };
    if (prev) markFoundLocally(prev, now);
    setState({ active: spot, queue: [...state.queue, { type: "create", spot }] });
    return { spot, offline: true };
  }
}

function markFoundLocally(spot: Spot, foundAt: string) {
  if (isLocal(spot.id)) {
    setState({
      queue: state.queue.map((q) => (q.type === "create" && q.spot.id === spot.id ? { ...q, spot: { ...q.spot, foundAt } } : q)),
    });
  } else {
    setState({ queue: [...state.queue, { type: "found", id: spot.id, foundAt }] });
  }
  retireActive(foundAt);
}

export async function updateSpot(id: string, details: Partial<SpotDetails>): Promise<Spot> {
  mutations += 1;
  if (isLocal(id)) {
    const patch = (s: Spot) => (s.id === id ? { ...s, ...details } : s);
    setState({
      active: state.active && patch(state.active),
      history: state.history.map(patch),
      queue: state.queue.map((q) => (q.type === "create" ? { ...q, spot: patch(q.spot) } : q)),
    });
    return (state.active?.id === id ? state.active : state.history.find((s) => s.id === id))!;
  }
  if (details.photoUrl?.startsWith("data:")) throw new OfflineError("No signal");
  const { photoUrl: _photoUrl, ...body } = details;
  const spot = await api.update(id, body);
  setState({
    active: state.active?.id === id ? spot : state.active,
    history: state.history.map((s) => (s.id === id ? spot : s)),
  });
  return spot;
}

export async function foundCar(): Promise<void> {
  mutations += 1;
  const spot = state.active;
  if (!spot) return;
  const foundAt = new Date().toISOString();
  if (isLocal(spot.id)) {
    markFoundLocally(spot, foundAt);
    void sync();
    return;
  }
  try {
    const updated = await api.found(spot.id, foundAt);
    setState({ active: null, history: [updated, ...state.history].sort(byNewest) });
  } catch (e) {
    if (e instanceof OfflineError) return markFoundLocally(spot, foundAt);
    // Already marked found on another tab: just refresh.
    retireActive(foundAt);
    void sync();
  }
}

export async function removeSpot(id: string): Promise<void> {
  mutations += 1;
  if (isLocal(id)) {
    setState({
      history: state.history.filter((s) => s.id !== id),
      queue: state.queue.filter((q) => !(q.type === "create" && q.spot.id === id)),
    });
    return;
  }
  await api.remove(id);
  setState({ history: state.history.filter((s) => s.id !== id) });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void sync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void sync();
  });
}
