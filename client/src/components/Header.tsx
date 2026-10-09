/** Bloody Dave's Fishing Planner — focused product chrome. */

export function Header() {
  return (
    <header className="app-header sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="app-shell app-header-inner flex items-center px-3 min-[700px]:px-4 min-h-[56px] min-[700px]:min-h-[64px]">
        <div className="flex items-center gap-2.5 min-w-0 shrink-0" aria-label="Bloody Dave's Fishing Planner">
          <img
            src="/bloody-dave-original.webp"
            alt=""
            className="h-10 w-10 rounded-full object-cover border border-[var(--border)] shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-[var(--action)] leading-none">
              Bloody Dave&apos;s
            </p>
            <h1 className="mt-0.5 text-[16px] font-semibold tracking-tight text-[var(--text)] leading-tight truncate">
              Fishing Planner
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
