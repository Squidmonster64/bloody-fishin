import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--app-bg)] text-[var(--text)] px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--action)]">Bloody Dave&apos;s</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">That route is not part of the fishing planner.</p>
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="mt-5 min-h-[40px] rounded border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text)] hover:border-[var(--action)] hover:text-[var(--action)]"
        >
          Back to Decision
        </button>
      </div>
    </div>
  );
}
