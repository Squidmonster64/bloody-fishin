/**
 * Bloody Dave's Fishing Planner — Home Page
 * Design: Nautical dark-mode dashboard. Deep ocean navy (#0a1628) base,
 * coral-orange (#ff6b35) accent, seafoam green (#3ecf8e) for good conditions.
 */
import { useEffect, useState } from "react";
import { useFishingData } from "@/hooks/useFishingData";
import { useMySpots } from "@/hooks/useMySpots";
import { Header } from "@/components/Header";
import { Controls } from "@/components/Controls";
import { DecisionView } from "@/components/DecisionView";
import { GraphView } from "@/components/GraphView";
import { SummaryView } from "@/components/SummaryView";
import { TableView } from "@/components/TableView";
import { SickieView } from "@/components/SickieView";
import { TabBar } from "@/components/TabBar";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { PrintView } from "@/components/PrintView";
import { BriefingSheet } from "@/components/BriefingSheet";
import { CompareSpotsSheet } from "@/components/CompareSpotsSheet";

export default function Home() {
  const { state, loadData, refresh, clearCache, setLocation, setDays, setView, setHourlyDay, toggleVis, setCustomLocation } = useFishingData();
  const { spots, addSpot, updateSpot, deleteSpot } = useMySpots();
  const [showPrint, setShowPrint] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    loadData(state.location, state.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628] text-white font-sans">
      <Header />
      <Controls
        state={state}
        spots={spots}
        onLocationChange={setLocation}
        onDaysChange={setDays}
        onCustomLocation={setCustomLocation}
        onAddSpot={addSpot}
        onUpdateSpot={updateSpot}
        onDeleteSpot={deleteSpot}
        onPrint={() => setShowPrint(true)}
        onBrief={() => setShowBrief(true)}
        onCompare={() => setShowCompare(true)}
        onRefresh={refresh}
      />
      <TabBar view={state.view} onViewChange={setView} />

      <main className="flex-1 overflow-hidden">
        {state.loading && !state.data && <LoadingState />}
        {state.loading && state.data && <div className="border-b border-[#1e3a5f] bg-[#0d1f3c] px-3 py-2 text-center text-xs text-[#7a9bb5]">Refreshing live conditions… showing the latest saved forecast meanwhile.</div>}
        {state.refreshFailed && state.data && !state.loading && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-orange-400/40 bg-orange-400/10 px-3 py-2 text-center text-xs text-orange-100">
            <span>Live refresh failed — showing the saved forecast. Check signal and try again before you leave.</span>
            <button onClick={refresh} className="min-h-[32px] rounded border border-orange-200/50 px-2 font-bold text-orange-50 hover:bg-orange-300/15">↻ Retry refresh</button>
          </div>
        )}
        {state.cacheSavedAt && !state.loading && !state.refreshFailed && <div className="flex flex-wrap items-center justify-center gap-2 border-b border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-center text-xs text-yellow-200"><span>📡 Saved forecast from {new Date(state.cacheSavedAt).toLocaleString("en-AU")}. It could be stale.</span><button onClick={refresh} className="min-h-[32px] rounded border border-yellow-300/50 px-2 font-bold text-yellow-100 hover:bg-yellow-300/15">↻ Refresh now</button><button onClick={clearCache} className="min-h-[32px] rounded border border-yellow-300/30 px-2 font-semibold text-yellow-100 hover:bg-yellow-300/15">Clear saved copy</button></div>}
        {state.data && (state.days > 8 || state.data.requestedDays && state.data.requestedDays > 8) && !state.loading && (
          <div className="border-b border-sky-400/30 bg-sky-400/10 px-3 py-2 text-center text-xs text-sky-100">
            Days 9–14 are weather and fishing outlook only — marine swell/chop/SL20 vessel calls stop after day 8{state.data.marineThrough ? ` (marine through ${state.data.marineThrough})` : ""}.
          </div>
        )}
        {state.error && <ErrorState error={state.error} onRetry={() => loadData(state.location, state.days)} />}
        {!state.error && state.data && (
          <>
            {state.view === "decision" && (
              <DecisionView
                data={state.data}
                fetchedAt={state.data.fetchedAt}
                cacheSavedAt={state.cacheSavedAt}
                onOpenView={setView}
                onRefresh={refresh}
              />
            )}
            {state.view === "graph" && (
              <GraphView
                data={state.data}
                hourlyDay={state.hourlyDay || state.data.daily[0]?.date || ""}
                onDayChange={setHourlyDay}
                vis={state.vis}
                onToggleVis={toggleVis}
              />
            )}
            {state.view === "summary" && <SummaryView data={state.data} />}
            {state.view === "table"   && <TableView   data={state.data} />}
            {state.view === "sickie"  && <SickieView  data={state.data} />}
          </>
        )}
        {!state.loading && !state.error && !state.data && (
          <div className="flex items-center justify-center h-64 text-[#7a9bb5]">
            <p>Select a location to load conditions</p>
          </div>
        )}
      </main>

      {/* Print overlay — only rendered when triggered */}
      {showPrint && state.data && (
        <PrintView
          data={state.data}
          vis={state.vis}
          onClose={() => setShowPrint(false)}
        />
      )}
      {showBrief && state.data && <BriefingSheet data={state.data} onClose={() => setShowBrief(false)} />}
      {showCompare && state.data && <CompareSpotsSheet baseData={state.data} savedSpots={spots} onClose={() => setShowCompare(false)} />}
      <footer className="border-t border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-center text-[10px] leading-relaxed text-[#7a9bb5]">
        Planning aid for Australian fishing and small-boat decisions. Always check official Bureau of Meteorology marine warnings, local knowledge and skipper judgement before you go.
      </footer>
    </div>
  );
}

