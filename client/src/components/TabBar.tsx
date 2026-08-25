/** Tab navigation — Decision / Charts / Daily / Hourly / Sickie
 * Desktop: top underline strip. Mobile: fixed bottom nav (single system).
 */
import type { ViewType } from "@/hooks/useFishingData";

const TABS: { id: ViewType; label: string; short: string }[] = [
  { id: "decision", label: "Decision", short: "Now" },
  { id: "graph", label: "Charts", short: "Charts" },
  { id: "summary", label: "Daily", short: "Daily" },
  { id: "table", label: "Hourly", short: "Hourly" },
  { id: "sickie", label: "Sickie", short: "Sickie" },
];

interface Props {
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  /** When true, render as fixed bottom bar (mobile). */
  placement?: "top" | "bottom";
}

export function TabBar({ view, onViewChange, placement = "top" }: Props) {
  const isBottom = placement === "bottom";

  return (
    <nav
      className={
        isBottom
          ? "fixed bottom-0 inset-x-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] flex print:hidden pb-[env(safe-area-inset-bottom)]"
            : "bg-[var(--surface)] border-b border-[var(--border)] flex overflow-x-auto sticky top-[3.75rem] z-40 scrollbar-hide print:hidden"
      }
      aria-label="Primary views"
    >
      {TABS.map(tab => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewChange(tab.id)}
            className={`relative flex flex-1 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-semibold whitespace-nowrap transition-colors duration-150 min-h-[52px] sm:min-h-[48px]
              ${
                active
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {active && (
              <span
                aria-hidden
                className={
                  isBottom
                    ? "absolute top-0 inset-x-3 h-0.5 bg-[var(--action)] rounded-full"
                    : "absolute bottom-0 inset-x-2 sm:inset-x-3 h-0.5 bg-[var(--action)] rounded-full"
                }
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
