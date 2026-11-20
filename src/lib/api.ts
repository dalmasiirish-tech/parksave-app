import type { Coords, Spot, SpotDetails } from "./types";

const DEVICE_KEY = "parksave:device";

export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Thrown when the phone has no signal, so callers can fall back to saving locally. */
export class OfflineError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!navigator.onLine) throw new OfflineError("No signal");
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "x-device-id": deviceId(), ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new OfflineError("No signal");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

export const api = {
  list: () => request<{ active: Spot | null; history: Spot[] }>("/api/spots"),

  create: (details: Partial<SpotDetails> & Partial<Coords> & { parkedAt?: string; foundAt?: string }) =>
    request<Spot>("/api/spots", { method: "POST", body: JSON.stringify(details) }),

  update: (id: string, details: Partial<SpotDetails>) =>
    request<Spot>(`/api/spots/${id}`, { method: "PATCH", body: JSON.stringify(details) }),

  found: (id: string, foundAt?: string) =>
    request<Spot>(`/api/spots/${id}/found`, { method: "POST", body: JSON.stringify({ foundAt }) }),

  remove: (id: string) => request<{ ok: true }>(`/api/spots/${id}`, { method: "DELETE" }),

  uploadPhoto: (photo: Blob) =>
    request<{ key: string; url: string }>("/api/photos", {
      method: "POST",
      body: photo,
      headers: { "content-type": photo.type || "image/jpeg" },
    }),
};
