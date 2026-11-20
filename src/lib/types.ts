export interface Spot {
  id: string;
  building: string;
  level: string;
  slot: string;
  note: string;
  photoUrl: string | null;
  photoKey: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  parkedAt: string;
  foundAt: string | null;
  /** True while a spot saved without signal is waiting to sync. */
  pending?: boolean;
}

export interface SpotDetails {
  building: string;
  level: string;
  slot: string;
  note: string;
  /** Either an uploaded photo key, or a data URL kept locally until it can be uploaded. */
  photoKey: string | null;
  photoUrl: string | null;
}

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}
