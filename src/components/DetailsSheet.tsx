import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { api, OfflineError } from "../lib/api";
import { blobToDataUrl, compressImage } from "../lib/image";
import type { SpotDetails } from "../lib/types";
import { Sheet } from "./Sheet";

const LEVELS = ["B3", "B2", "B1", "LG", "G", "UG", "2F", "3F", "4F", "5F", "6F", "Roof"];

const PH_PLACES = [
  "SM Mall of Asia",
  "SM Megamall",
  "SM North EDSA",
  "SM Aura Premier",
  "Glorietta",
  "Greenbelt",
  "Ayala Malls Manila Bay",
  "Ayala Malls TriNoma",
  "Uptown Mall BGC",
  "Market! Market!",
  "Robinsons Galleria",
  "Robinsons Place Manila",
  "Power Plant Mall",
  "Festival Mall Alabang",
  "Shangri-La Plaza",
  "Greenhills Shopping Center",
  "NAIA Terminal 3 Parking",
  "Ayala Center Cebu",
  "SM City Cebu",
  "SM Lanang Davao",
];

const EMPTY: SpotDetails = { building: "", level: "", slot: "", note: "", photoKey: null, photoUrl: null };

interface Props {
  open: boolean;
  mode: "create" | "edit" | "after-save";
  initial?: Partial<SpotDetails>;
  recentBuildings: string[];
  onClose: () => void;
  onSubmit: (details: SpotDetails) => Promise<void>;
}

const label = "mb-2 block text-xs font-bold tracking-[0.18em] text-clay uppercase";
const field =
  "w-full rounded-2xl border-2 border-sand bg-white/70 px-4 py-3.5 text-[17px] font-semibold text-ink placeholder:font-medium placeholder:text-nude focus:border-peach-deep focus:bg-white focus:outline-none";

export function DetailsSheet({ open, mode, initial, recentBuildings, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<SpotDetails>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, ...initial });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof SpotDetails>(key: K, value: SpotDetails[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await compressImage(file);
      try {
        const { key, url } = await api.uploadPhoto(blob);
        setForm((f) => ({ ...f, photoKey: key, photoUrl: url }));
      } catch (e) {
        if (!(e instanceof OfflineError)) throw e;
        // No signal: keep a smaller copy on the phone and upload it later.
        const small = await compressImage(file, 900, 0.7);
        const dataUrl = await blobToDataUrl(small);
        setForm((f) => ({ ...f, photoUrl: dataUrl }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that photo");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, building: form.building.trim(), level: form.level.trim(), slot: form.slot.trim().toUpperCase(), note: form.note.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const places = Array.from(new Set([...recentBuildings, ...PH_PLACES]));
  const title = mode === "edit" ? "Edit parking details" : mode === "after-save" ? "Spot saved! Add details" : "Type parking details";
  const eyebrow = mode === "after-save" ? "Location & time locked" : mode === "create" ? "Manual entry" : "Your spot";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      footer={
        <div className="flex gap-3">
          {mode === "after-save" && (
            <button type="button" onClick={onClose} className="h-16 rounded-[1.4rem] bg-sand px-5 text-lg font-bold text-cocoa transition active:scale-95">
              Skip
            </button>
          )}
          <button
            type="submit"
            form="details-form"
            disabled={saving || uploading}
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-[1.4rem] bg-espresso text-lg font-extrabold text-cream shadow-soft transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving && <LoaderCircle className="size-5 animate-spin" />}
            {mode === "create" ? "Save My Parking Spot" : "Save details"}
          </button>
        </div>
      }
    >
      <form id="details-form" onSubmit={submit} className="space-y-6 pb-2">
        <div>
          <label htmlFor="building" className={label}>
            Building / Mall
          </label>
          <input
            id="building"
            list="ph-places"
            value={form.building}
            onChange={(e) => set("building", e.target.value)}
            placeholder="e.g. SM Megamall, Building B"
            className={field}
            autoComplete="off"
            maxLength={120}
          />
          <datalist id="ph-places">
            {places.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div>
          <span className={label}>Floor / Level</span>
          <div className="grid grid-cols-4 gap-2">
            {LEVELS.map((lvl) => {
              const active = form.level.toUpperCase() === lvl.toUpperCase();
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => set("level", active ? "" : lvl)}
                  aria-pressed={active}
                  className={`h-14 rounded-2xl text-lg font-extrabold transition active:scale-95 ${
                    active ? "bg-espresso text-peach shadow-soft" : "bg-linen text-cocoa ring-1 ring-sand"
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
          <input
            aria-label="Other level"
            value={LEVELS.some((l) => l.toUpperCase() === form.level.toUpperCase()) ? "" : form.level}
            onChange={(e) => set("level", e.target.value)}
            placeholder="Other level (e.g. P4, Mezzanine)"
            className={`${field} mt-2`}
            maxLength={40}
          />
        </div>

        <div>
          <label htmlFor="slot" className={label}>
            Slot number
          </label>
          <input
            id="slot"
            value={form.slot}
            onChange={(e) => set("slot", e.target.value)}
            placeholder="e.g. C-142"
            className={`${field} py-4 font-display text-2xl tracking-wide uppercase`}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={40}
          />
        </div>

        <div>
          <span className={label}>Photo</span>
          {form.photoUrl ? (
            <div className="relative overflow-hidden rounded-3xl bg-sand">
              <img src={form.photoUrl} alt="Parking spot photo" className="max-h-64 w-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, photoKey: null, photoUrl: null }))}
                className="absolute top-3 right-3 flex h-11 items-center gap-1.5 rounded-full bg-ink/75 px-4 text-sm font-bold text-cream backdrop-blur"
              >
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={uploading}
                className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-nude bg-linen/60 font-bold text-cocoa transition active:scale-95"
              >
                {uploading ? <LoaderCircle className="size-7 animate-spin text-clay" /> : <Camera className="size-7 text-clay" />}
                {uploading ? "Adding…" : "Take photo"}
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
                className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-nude bg-linen/60 font-bold text-cocoa transition active:scale-95"
              >
                <ImagePlus className="size-7 text-clay" />
                From gallery
              </button>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (onPhoto(e.target.files?.[0]), (e.target.value = ""))} />
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => (onPhoto(e.target.files?.[0]), (e.target.value = ""))} />
          <p className="mt-2 text-sm text-brown">Snap the pillar sign or nearest landmark.</p>
        </div>

        <div>
          <label htmlFor="note" className={label}>
            Note
          </label>
          <textarea
            id="note"
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. Near the Jollibee entrance, beside pillar 4C"
            rows={3}
            maxLength={500}
            className={`${field} resize-none font-medium`}
          />
        </div>

        {error && <p className="rounded-2xl bg-rose/10 px-4 py-3 text-[15px] font-semibold text-rose">{error}</p>}
      </form>
    </Sheet>
  );
}
