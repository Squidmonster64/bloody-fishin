export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-[var(--text-muted)]">
      <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--action)] rounded-full animate-spin" />
      <p className="text-sm">Fetching conditions from Open-Meteo…</p>
    </div>
  );
}
