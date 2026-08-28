/** Bloody Dave's Fishing Planner — compact family chrome.
 * Brand mark always returns to Control. Suite product links on tablet/desktop.
 */
import { SuiteNav } from "@/components/SuiteNav";
import { CONTROL_URL } from "@/lib/suiteNav";

export function Header() {
  const dateLabel = new Date().toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2.5 px-3 min-[700px]:px-4 min-h-[44px] min-[700px]:min-h-[40px]">
        <a
          href={CONTROL_URL}
          className="flex items-center gap-2 min-w-0 shrink-0 text-inherit no-underline"
          aria-label="Bloody Dave's Control"
        >
          <img
            src="/bloody-dave-original.webp"
            alt=""
            className="h-8 w-8 rounded-full object-cover border border-[var(--border)] shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-[var(--action)] leading-none">
              Bloody Dave&apos;s
            </p>
            <h1 className="mt-0.5 text-[13px] font-semibold tracking-tight text-[var(--text)] leading-tight truncate">
              Fishing Planner
            </h1>
          </div>
        </a>
        <p className="hidden min-[700px]:block shrink-0 text-[10px] text-[var(--text-muted)]">
          Boating + fishing
        </p>
        <p className="min-[700px]:hidden text-[10px] text-[var(--text-muted)] truncate">
          Boating + fishing
        </p>

        <div className="hidden min-[700px]:block h-4 w-px bg-[var(--border)] shrink-0" aria-hidden />
        <SuiteNav />

        <p className="ml-auto hidden md:block shrink-0 text-[10px] text-[var(--text-muted)] tabular-nums">
          {dateLabel}
        </p>
      </div>
    </header>
  );
}
