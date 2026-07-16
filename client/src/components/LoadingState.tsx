export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-[#7a9bb5]">
      <div className="w-12 h-12 border-4 border-[#1e3a5f] border-t-[#ff6b35] rounded-full animate-spin" />
      <p className="text-sm">Fetching conditions from Open-Meteo…</p>
    </div>
  );
}
