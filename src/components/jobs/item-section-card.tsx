"use client";

import type { EditableJobItem } from "@/lib/jobs/editable-job";
import type { MockupVariant, SectionFileLabel } from "@/lib/jobs/local-jobs";

type ItemSectionCardProps = {
  item: EditableJobItem;
  onSectionFileChosenLabelChange?: (fileIndex: number, nextLabel: SectionFileLabel) => void;
};

function formatRosterRow(itemName: string, row: EditableJobItem["roster"][number]) {
  const details = [row.name, row.number ? `- ${row.number}` : "", row.size ? `(${row.size})` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    key: `${itemName}-${row.rowNumber}-${row.name}-${row.number}-${row.size}`,
    label: details || `Row ${row.rowNumber}`
  };
}

const sectionFileLabelOptions: Array<{ value: SectionFileLabel; label: string }> = [
  { value: "mockup", label: "Mockup" },
  { value: "cutpiece", label: "Cut Pieces" },
  { value: "colorcode", label: "Color Code" },
  { value: "unknown", label: "Unknown" }
];

function formatSectionFileLabel(label: SectionFileLabel) {
  return sectionFileLabelOptions.find((option) => option.value === label)?.label ?? "Unknown";
}

function formatMockupVariant(variant?: MockupVariant) {
  if (!variant) return null;

  return `${variant.charAt(0).toUpperCase()}${variant.slice(1)} mockup`;
}

export function ItemSectionCard({ item, onSectionFileChosenLabelChange }: ItemSectionCardProps) {
  const detailFields = [
    { label: "Cutting", value: item.cuttingType ?? "" },
    { label: "Collar", value: item.collarType ?? "" },
    { label: "Material", value: item.material ?? "" }
  ].filter((field) => field.value);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{item.name || "Untitled item"}</h3>
          <p className="mt-1 text-sm text-neutral-600">
            {item.roster.length} roster row{item.roster.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {detailFields.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {detailFields.map((field) => (
            <div key={field.label} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{field.label}</dt>
              <dd className="mt-1 text-sm text-neutral-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 space-y-2">
        {item.roster.length ? (
          item.roster.map((row) => {
            const formattedRow = formatRosterRow(item.name, row);
            return (
              <div key={formattedRow.key} className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                {formattedRow.label}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-neutral-500">No roster rows in this item yet.</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">Upload section files</p>
          <p className="mt-1 text-xs text-neutral-500">
            Upload mockup, cut pieces, and color code images together for this section.
          </p>
        </div>
        {(item.sectionFiles ?? []).length ? (
          <div className="mt-3 space-y-3">
            {(item.sectionFiles ?? []).map((file, index) => (
              <div key={`${item.name || "item"}-${file.name}-${index}`} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{file.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white">
                        {`Detected ${formatSectionFileLabel(file.detectedLabel)}`}
                      </span>
                      {formatMockupVariant(file.mockupVariant) ? (
                        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
                          {formatMockupVariant(file.mockupVariant)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    <span className="block">Chosen label</span>
                    <select
                      aria-label="Chosen label"
                      value={file.chosenLabel}
                      onChange={(event) =>
                        onSectionFileChosenLabelChange?.(index, event.target.value as SectionFileLabel)
                      }
                      className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      {sectionFileLabelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No section files uploaded for this section yet.</p>
        )}
      </div>
    </section>
  );
}
