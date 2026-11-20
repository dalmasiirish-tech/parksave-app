import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useToasts } from "../lib/toast";

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),1rem)]" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === "error" ? CircleAlert : t.tone === "success" ? CircleCheck : Info;
        return (
          <div
            key={t.id}
            className={`flex w-full max-w-md animate-rise items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold shadow-lift ${
              t.tone === "error" ? "bg-rose text-cream" : "bg-espresso text-cream"
            }`}
          >
            <Icon className={`size-5 shrink-0 ${t.tone === "success" ? "text-peach" : ""}`} />
            {t.text}
          </div>
        );
      })}
    </div>
  );
}
