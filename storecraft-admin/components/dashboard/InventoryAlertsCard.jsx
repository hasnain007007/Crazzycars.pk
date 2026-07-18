import Link from "next/link";

export function InventoryAlertsCard({ products }) {
  const rows = (products || []).slice(0, 6);
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Inventory alerts</h3>
          <p className="text-xs text-slate-400">Low stock products</p>
        </div>
        <Link href="/reports/stock" className="text-xs font-semibold text-[#1A7A4C] hover:underline">
          Stock report
        </Link>
      </div>
      {!rows.length ? (
        <p className="mt-8 text-center text-sm text-emerald-600">All stocked up</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((p) => {
            const qty = Number(p.quantity) || 0;
            const critical = qty <= 3;
            return (
              <li key={p.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/catalog/products/${p.id}`}
                    className="font-medium text-slate-800 hover:text-[#1A7A4C] dark:text-slate-100"
                  >
                    {p.name}
                  </Link>
                  <p className={`text-xs ${critical ? "text-red-600" : "text-amber-600"}`}>
                    {qty} left · threshold {p.threshold}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
