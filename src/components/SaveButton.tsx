import { LoaderCircle } from "lucide-react";

interface Props {
  onSave: () => void;
  busy: boolean;
  label?: string;
}

/** The hero action: a big, pressable button sitting inside painted parking-bay lines. */
export function SaveButton({ onSave, busy, label = "Save My Parking Spot" }: Props) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[21rem]">
      {/* parking bay */}
      <div className="bay-lines absolute inset-x-6 inset-y-0 rounded-[2.5rem] border-x-[6px] border-dashed border-nude/90" aria-hidden />
      <div className="absolute inset-x-6 bottom-0 h-[6px] rounded-full bg-nude/90" aria-hidden />

      <div className="absolute inset-[11%] grid place-items-center">
        {!busy && <span className="absolute inset-0 animate-ripple rounded-full bg-peach" aria-hidden />}
        <button
          onClick={onSave}
          disabled={busy}
          className="group relative grid size-full place-items-center rounded-full bg-gradient-to-b from-peach to-peach-deep text-espresso shadow-[0_14px_0_0_var(--color-clay),0_30px_50px_-12px_rgb(58_40_32/0.5)] transition-all duration-150 active:translate-y-[10px] active:shadow-[0_4px_0_0_var(--color-clay),0_12px_24px_-10px_rgb(58_40_32/0.5)] disabled:translate-y-[6px] disabled:cursor-wait"
        >
          <span className="absolute inset-[7%] rounded-full border-2 border-cream/45" aria-hidden />
          <span className="flex flex-col items-center gap-3 px-8 text-center">
            <span className="grid size-[4.5rem] place-items-center rounded-[1.35rem] bg-espresso font-display text-[2.9rem] leading-none font-bold text-peach shadow-soft">
              {busy ? <LoaderCircle className="size-9 animate-spin" strokeWidth={2.5} /> : "P"}
            </span>
            <span className="font-display text-[1.7rem] leading-[1.05] font-semibold">
              {busy ? "Locking your spot…" : label}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
