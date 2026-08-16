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
import { GraphView } from "@/components/GraphView";
import { SummaryView } from "@/components/SummaryView";
import { TableView } from "@/components/TableView";
import { SickieView } from "@/components/SickieView";
import { TabBar } from "@/components/TabBar";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { PrintView } from "@/components/PrintView";
import { AIDataAccess } from "@/components/AIDataAccess";
import { BriefingSheet } from "@/components/BriefingSheet";
import { CompareSpotsSheet } from "@/components/CompareSpotsSheet";

export default function Home() {
  const { state, loadData, refresh, clearCache, setLocation, setDays, setView, setHourlyDay, toggleVis, setCustomLocation } = useFishingData();
  const { spots, addSpot, updateSpot, deleteSpot } = useMySpots();
  const [showPrint, setShowPrint] = useState(false);
  const [showAIData, setShowAIData] = useState(false);
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
        onAIData={() => setShowAIData(true)}
        onBrief={() => setShowBrief(true)}
        onCompare={() => setShowCompare(true)}
        onRefresh={refresh}
      />
      <TabBar view={state.view} onViewChange={setView} />

      <main className="flex-1 overflow-hidden">
        {state.loading && !state.data && <LoadingState />}
        {state.loading && state.data && <div className="border-b border-[#1e3a5f] bg-[#0d1f3c] px-3 py-2 text-center text-xs text-[#7a9bb5]">Refreshing live conditions… showing the latest saved forecast meanwhile.</div>}
        {state.cacheSavedAt && !state.loading && <div className="flex flex-wrap items-center justify-center gap-2 border-b border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-center text-xs text-yellow-200"><span>📡 Saved forecast from {new Date(state.cacheSavedAt).toLocaleString("en-AU")}. It could be stale.</span><button onClick={refresh} className="min-h-[32px] rounded border border-yellow-300/50 px-2 font-bold text-yellow-100 hover:bg-yellow-300/15">↻ Refresh now</button><button onClick={clearCache} className="min-h-[32px] rounded border border-yellow-300/30 px-2 font-semibold text-yellow-100 hover:bg-yellow-300/15">Clear saved copy</button></div>}
        {state.error && <ErrorState error={state.error} onRetry={() => loadData(state.location, state.days)} />}
        {!state.error && state.data && (
          <>
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
      {showAIData && (
        <AIDataAccess
          location={state.location}
          days={state.days}
          timezone={state.timezone}
          onClose={() => setShowAIData(false)}
        />
      )}
      {showBrief && state.data && <BriefingSheet data={state.data} onClose={() => setShowBrief(false)} />}
      {showCompare && state.data && <CompareSpotsSheet baseData={state.data} savedSpots={spots} onClose={() => setShowCompare(false)} />}
    </div>
  );
}
