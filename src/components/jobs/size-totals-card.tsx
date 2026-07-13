import { sumSizeTotals, type SizeTotals } from "@/lib/jobs/size-totals";

export function SizeTotalsCard({ totals }: { totals: SizeTotals }) {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  const grandTotal = sumSizeTotals(totals);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Size totals</h2>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
          Total: {grandTotal}
        </span>
      </div>

      {!entries.length ? (
        <p className="mt-3 text-sm text-neutral-600">No sizes detected yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {entries.map(([size, total]) => (
            <div key={size} className="rounded-md bg-neutral-100 p-3 text-sm">
              <span className="font-medium">{size}</span>: {total}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

