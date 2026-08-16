/** Bloody Dave's Fishing Planner — Header
 * Nautical dark dashboard style: deep navy bg, coral accent, Bebas Neue title.
 */
export function Header() {
  return (
    <header className="bg-[#0d1f3c] border-b border-[#1e3a5f] px-3 py-2 flex items-center gap-3 sticky top-0 z-50 shadow-lg">
      <img
        src="/bloody-dave-original.webp"
        alt="Bloody Dave"
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover border-2 border-[#ff6b35] flex-shrink-0"
      />
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black tracking-wide text-[#ff6b35] leading-none"
            style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}>
          Bloody Dave's Fishing Planner
        </h1>
        <p className="text-[10px] sm:text-xs text-[#7a9bb5] mt-0.5 truncate">
          SL20 Boating + Fishing Conditions · Powered by Open-Meteo
        </p>
      </div>
      <div className="ml-auto flex-shrink-0 text-right hidden sm:block">
        <p className="text-[10px] text-[#7a9bb5]">
          {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}
        </p>
      </div>
    </header>
  );
}
