import Link from "next/link";

/**
 * Storefront Previous / Next blocks for detail pages.
 * @param {{
 *   prev?: { name: string, href: string } | null,
 *   next?: { name: string, href: string } | null,
 * }} props
 */
export function DetailNeighborNav({ prev = null, next = null }) {
  if (!prev?.href && !next?.href) return null;

  const cell = (side, item) => {
    if (!item?.href) {
      return (
        <div
          className="hidden min-w-0 flex-1 md:block"
          aria-hidden
        />
      );
    }
    const isPrev = side === "prev";
    return (
      <Link
        href={item.href}
        title={item.name}
        className={[
          "group flex min-w-0 flex-1 items-center gap-3 rounded-none border border-[#E5E5E5] bg-white px-4 py-4 no-underline transition-colors hover:border-[#111111]",
          isPrev ? "text-left" : "flex-row-reverse text-right",
        ].join(" ")}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#E5E5E5] text-lg text-[#111111] transition-colors group-hover:border-[#111111]"
          aria-hidden
        >
          {isPrev ? "←" : "→"}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888888]">
            {isPrev ? "Previous" : "Next"}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-[#111111]">{item.name}</span>
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Previous and next"
      className="mx-auto mt-10 flex w-full max-w-[1200px] flex-col gap-3 px-5 pb-12 md:flex-row md:gap-4"
    >
      {cell("prev", prev)}
      {cell("next", next)}
    </nav>
  );
}
