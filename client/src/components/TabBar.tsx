/** Tab navigation bar — mobile-first sizing, min 44px touch targets */
import type { ViewType } from "@/hooks/useFishingData";

const TABS: { id: ViewType; label: string; emoji: string }[] = [
  { id: "decision", label: "Now",     emoji: "🧭" },
  { id: "graph",    label: "Graph",   emoji: "📈" },
  { id: "summary",  label: "Summary", emoji: "📋" },
  { id: "table",    label: "Table",   emoji: "🗂️" },
  { id: "sickie",   label: "Sickie",  emoji: "🎣" },
];

interface Props {
  view: ViewType;
  onViewChange: (v: ViewType) => void;
}

export function TabBar({ view, onViewChange }: Props) {
  return (
    <nav className="bg-[#0d1f3c] border-b border-[#1e3a5f] flex overflow-x-auto sticky top-0 z-40 scrollbar-hide print:hidden">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-sm sm:text-base font-bold whitespace-nowrap border-b-2 transition-all duration-150 flex-1 min-h-[48px]
            ${view === tab.id
              ? "border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10"
              : "border-transparent text-[#7a9bb5] hover:text-white hover:bg-white/5"
            }`}
        >
          <span className="text-base">{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
