/** Compact horizontal Bloody Dave's suite nav — tablet/desktop only. */
import { SUITE_PRODUCTS } from "@/lib/suiteNav";

export function SuiteNav() {
  return (
    <nav
      className="hidden min-[700px]:flex items-center gap-x-3 min-[1024px]:gap-x-4 overflow-x-auto scrollbar-hide min-w-0"
      aria-label="Bloody Dave's Suite"
    >
      {SUITE_PRODUCTS.map(product => (
        <a
          key={product.id}
          href={product.href}
          aria-current={product.current ? "page" : undefined}
          className={`shrink-0 text-[12px] leading-none no-underline ${
            product.current
              ? "font-semibold text-[var(--text)]"
              : "font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          {product.name}
        </a>
      ))}
    </nav>
  );
}
