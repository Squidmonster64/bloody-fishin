/**
 * Bloody Dave's Fishing Planner — Home Page
 * Design: Nautical dark-mode dashboard. Deep ocean navy (#0a1628) base,
 * coral-orange (#ff6b35) accent, seafoam green (#3ecf8e) for good conditions.
 * Typography: Bebas Neue for headings, Inter for data.
 */
import { useEffect } from "react";
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

export default function Home() {
  const { state, loadData, setLocation, setDays, setView, setHourlyDay, toggleVis, setCustomLocation } = useFishingData();
  const { spots, addSpot, updateSpot, deleteSpot } = useMySpots();

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
      />
      <TabBar view={state.view} onViewChange={setView} />

      <main className="flex-1 overflow-hidden">
        {state.loading && <LoadingState />}
        {state.error && <ErrorState error={state.error} onRetry={() => loadData(state.location, state.days)} />}
        {!state.loading && !state.error && state.data && (
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
            {state.view === "summary" && (
              <SummaryView data={state.data} />
            )}
            {state.view === "table" && (
              <TableView data={state.data} />
            )}
            {state.view === "sickie" && (
              <SickieView data={state.data} />
            )}
          </>
        )}
        {!state.loading && !state.error && !state.data && (
          <div className="flex items-center justify-center h-64 text-[#7a9bb5]">
            <p>Select a location to load conditions</p>
          </div>
        )}
      </main>
    </div>
  );
}
