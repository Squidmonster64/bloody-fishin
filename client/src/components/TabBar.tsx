/** Tab navigation bar */
import type { ViewType } from "@/hooks/useFishingData";

const TABS: { id: ViewType; label: string; emoji: string }[] = [
  { id: "graph",   label: "Graph",   emoji: "📈" },
  { id: "summary", label: "Summary", emoji: "📋" },
  { id: "table",   label: "Table",   emoji: "🗂️" },
  { id: "sickie",  label: "Sickie Forecast", emoji: "🎣" },
];

interface Props {
  view: ViewType;
  onViewChange: (v: ViewType) => void;
}

export function TabBar({ view, onViewChange }: Props) {
  return (
    <nav className="bg-[#0d1f3c] border-b border-[#1e3a5f] flex overflow-x-auto sticky top-[60px] z-40 scrollbar-hide">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 flex-shrink-0 min-w-[44px] min-h-[44px]
            ${view === tab.id
              ? "border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10"
              : "border-transparent text-[#7a9bb5] hover:text-white hover:bg-white/5"
            }`}
        >
          <span>{tab.emoji}</span>
          <span className="hidden xs:inline sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
