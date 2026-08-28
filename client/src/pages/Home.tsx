/**
 * Bloody Dave's Fishing Planner — Home Page
 * Marine-instrument shell using shared design tokens.
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
  const {
    state,
    loadData,
    refresh,
    clearCache,
    setLocation,
    setDays,
    setView,
    setHourlyDay,
    toggleVis,
    setCustomLocation,
  } = useFishingData();
  const { spots, addSpot, updateSpot, deleteSpot } = useMySpots();
  const [showPrint, setShowPrint] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    loadData(state.location, state.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--app-bg)] text-[var(--text)] font-sans overflow-x-hidden pb-[calc(44px+env(safe-area-inset-bottom))] min-[700px]:pb-0">
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
      {/* Tablet / desktop: compact top tabs. Phone: fixed bottom nav. */}
      <div className="hidden min-[700px]:block">
        <TabBar view={state.view} onViewChange={setView} placement="top" />
      </div>

      <main className="flex-1 overflow-hidden">
        {state.loading && !state.data && <LoadingState />}
        {state.loading && state.data && (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-center text-[11px] text-[var(--text-muted)]">
            Refreshing live conditions… showing the latest saved forecast meanwhile.
          </div>
        )}
        {state.refreshFailed && state.data && !state.loading && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 py-1.5 text-center text-[11px] text-[var(--warm-text)]">
            <span>
              Live refresh failed — showing the saved forecast. Check signal and try again before
              you leave.
            </span>
            <button
              onClick={refresh}
              className="min-h-[32px] rounded border border-[color-mix(in_srgb,var(--warning)_50%,transparent)] px-2 font-bold text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_15%,transparent)]"
            >
              ↻ Retry refresh
            </button>
          </div>
        )}
        {state.cacheSavedAt && !state.loading && !state.refreshFailed && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 py-1.5 text-center text-[11px] text-[var(--warm-text)]">
            <span>
              Saved forecast from {new Date(state.cacheSavedAt).toLocaleString("en-AU")}. It could
              be stale.
            </span>
            <button
              onClick={refresh}
              className="min-h-[32px] rounded border border-[color-mix(in_srgb,var(--warning)_50%,transparent)] px-2 font-bold text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_15%,transparent)]"
            >
              ↻ Refresh now
            </button>
            <button
              onClick={clearCache}
              className="min-h-[32px] rounded border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] px-2 font-semibold text-[var(--warm-text)] hover:bg-[color-mix(in_srgb,var(--warning)_15%,transparent)]"
            >
              Clear saved copy
            </button>
          </div>
        )}
        {state.data &&
          (state.days > 8 || (state.data.requestedDays && state.data.requestedDays > 8)) &&
          !state.loading && (
            <div className="border-b border-[color-mix(in_srgb,var(--sand)_30%,transparent)] bg-[color-mix(in_srgb,var(--sand)_10%,transparent)] px-3 py-1.5 text-center text-[11px] text-[var(--text)]">
              Days 9–14 are weather and fishing outlook only — marine swell/chop/SL20 vessel calls
              stop after day 8
              {state.data.marineThrough ? ` (marine through ${state.data.marineThrough})` : ""}.
            </div>
          )}
        {state.error && (
          <ErrorState error={state.error} onRetry={() => loadData(state.location, state.days)} />
        )}
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
            {state.view === "table" && <TableView data={state.data} />}
            {state.view === "sickie" && <SickieView data={state.data} />}
          </>
        )}
        {!state.loading && !state.error && !state.data && (
          <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
            <p>Select a location to load conditions</p>
          </div>
        )}
      </main>

      {showPrint && state.data && (
        <PrintView data={state.data} vis={state.vis} onClose={() => setShowPrint(false)} />
      )}
      {showBrief && state.data && (
        <BriefingSheet data={state.data} onClose={() => setShowBrief(false)} />
      )}
      {showCompare && state.data && (
        <CompareSpotsSheet
          baseData={state.data}
          savedSpots={spots}
          onClose={() => setShowCompare(false)}
        />
      )}

      <footer className="border-t border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
        Planning aid for Australian fishing and small-boat decisions. Always check official Bureau
        of Meteorology marine warnings, local knowledge and skipper judgement before you go.
      </footer>

      <div className="min-[700px]:hidden">
        <TabBar view={state.view} onViewChange={setView} placement="bottom" />
      </div>
    </div>
  );
}
