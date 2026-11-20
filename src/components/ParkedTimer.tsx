import { pad, splitDuration } from "../lib/format";
import { useNow } from "../lib/useNow";

export function ParkedTimer({ since }: { since: string }) {
  const now = useNow(1000);
  const { h, m, s } = splitDuration(now - new Date(since).getTime());
  const units = [
    { v: h, label: h === 1 ? "hour" : "hours" },
    { v: m, label: "mins" },
    { v: s, label: "secs" },
  ];
  return (
    <div className="flex items-end gap-1.5" role="timer" aria-label={`Parked for ${h} hours ${m} minutes`}>
      {units.map((u, i) => (
        <div key={u.label} className="flex items-end gap-1.5">
          <div className="flex flex-col items-center">
            <span className="tabular font-display text-[2.6rem] leading-none font-semibold text-ink">{pad(u.v)}</span>
            <span className="mt-1 text-[11px] font-bold tracking-[0.14em] text-clay uppercase">{u.label}</span>
          </div>
          {i < 2 && <span className="pb-6 font-display text-3xl text-nude">:</span>}
        </div>
      ))}
    </div>
  );
}
