/** Bloody Dave's Fishing Planner — Header
 * Marine-instrument shell: surface bar, Geist hierarchy, brand-first.
 */
export function Header() {
  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] px-3 sm:px-4 py-2.5 flex items-center gap-3 sticky top-0 z-50">
      <img
        src="/bloody-dave-original.webp"
        alt="Bloody Dave"
        className="h-11 w-11 sm:h-12 sm:w-12 rounded-full object-cover border border-[var(--border)] flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text)] leading-tight truncate">
          Bloody Dave&apos;s Fishing Planner
        </h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] uppercase bg-[color-mix(in_srgb,var(--action)_15%,transparent)] text-[var(--action)] border border-[color-mix(in_srgb,var(--action)_35%,transparent)]">
            Beta
          </span>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">
            Outdoor weather instrument · SL20 boating + fishing · Open-Meteo
          </p>
        </div>
      </div>
      <div className="ml-auto flex-shrink-0 text-right hidden sm:block">
        <p className="text-[10px] text-[var(--text-muted)] font-medium">
          {new Date().toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
    </header>
  );
}
