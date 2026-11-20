import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { shortDuration, spotTitle } from "../lib/format";
import { useNow } from "../lib/useNow";
import type { Spot } from "../lib/types";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  spot: Spot;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function FoundSheet({ open, spot, onClose, onConfirm }: Props) {
  const now = useNow(30000);
  const [busy, setBusy] = useState(false);
  const details = [spot.level && `Level ${spot.level}`, spot.slot && `Slot ${spot.slot}`].filter(Boolean).join(" · ");

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Nahanap mo na?"
      title="Found your car?"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="h-16 rounded-[1.4rem] bg-sand px-5 text-lg font-bold text-cocoa transition active:scale-95">
            Not yet
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-[1.4rem] bg-espresso text-lg font-extrabold text-cream shadow-soft transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <LoaderCircle className="size-5 animate-spin" />}
            Yes, clear my spot
          </button>
        </div>
      }
    >
      <div className="rounded-3xl bg-linen p-5 ring-1 ring-sand">
        <p className="text-xs font-bold tracking-[0.18em] text-clay uppercase">You were parked for</p>
        <p className="mt-1 font-display text-5xl font-semibold text-ink">{shortDuration(now - new Date(spot.parkedAt).getTime())}</p>
        <p className="mt-3 text-[16px] font-semibold text-cocoa">{spotTitle(spot)}</p>
        {details && spot.building && <p className="text-[15px] text-brown">{details}</p>}
      </div>
      <p className="mt-4 pb-2 text-[15px] text-brown">This spot moves to your history, and the home screen is ready for your next park.</p>
    </Sheet>
  );
}
