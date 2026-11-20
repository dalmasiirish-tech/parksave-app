import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// Sheets can stack (e.g. "Found" over "Find"), so lock page scroll by count.
let openSheets = 0;

export function Sheet({ open, onClose, title, eyebrow, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    openSheets += 1;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      openSheets -= 1;
      if (openSheets === 0) document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade bg-ink/45 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[94dvh] w-full max-w-lg animate-sheet flex-col rounded-t-[2rem] bg-cream shadow-lift">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-nude" />
        <header className="flex shrink-0 items-start justify-between gap-4 px-6 pt-4 pb-3">
          <div>
            {eyebrow && <p className="text-xs font-bold tracking-[0.18em] text-clay uppercase">{eyebrow}</p>}
            <h2 className="font-display text-[1.7rem] leading-tight font-semibold text-ink">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-cocoa transition active:scale-90"
          >
            <X className="size-5" strokeWidth={2.5} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">{children}</div>
        {footer && <div className="safe-bottom shrink-0 border-t border-sand bg-cream px-6 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
