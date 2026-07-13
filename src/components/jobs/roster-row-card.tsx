"use client";

import type { ParsedRosterRow } from "@/lib/jobs/parse-whatsapp";

export function RosterRowCard({ row }: { row: ParsedRosterRow }) {
  return (
    <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Row {row.rowNumber}</p>
        <div className="flex items-center gap-2">
          {row.qty > 1 ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
              x{row.qty}
            </span>
          ) : null}
          {row.size ? (
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
            {row.size}
          </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <span className="text-neutral-500">Name</span>
          <span className="col-span-2 font-medium">{row.name || "-"}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-neutral-500">Number</span>
          <span className="col-span-2 font-medium">{row.number || "-"}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-neutral-500">Remarks</span>
          <span className="col-span-2 font-medium">{row.remarks || "-"}</span>
        </div>
      </div>
    </div>
  );
}
