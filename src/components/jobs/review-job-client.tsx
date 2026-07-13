"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getLocalJob, upsertLocalJob } from "@/lib/jobs/local-jobs";
import type { LocalJobDraft } from "@/lib/jobs/local-jobs";
import type { SectionFileLabel } from "@/lib/jobs/local-jobs";
import { mergeJobDrafts } from "@/lib/jobs/editable-job";
import { buildSizeTotals } from "@/lib/jobs/size-totals";
import { SizeTotalsCard } from "./size-totals-card";
import { ItemSectionCard } from "./item-section-card";
import { EmptyState } from "@/components/ui/empty-state";

type EditableProjectField =
  | "projectName"
  | "placementNote"
  | "brandName"
  | "customerName"
  | "category"
  | "sizeLabel"
  | "dateLabel"
  | "cuttingType"
  | "material"
  | "collarType"
  | "sourceMessage"
  | "productionNotes";

export function ReviewJobClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<LocalJobDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const localJob = getLocalJob(jobId);
    setJob(localJob);

    async function loadDraft() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const dbJob = response.ok ? await response.json() : null;

        if (!isMounted || !dbJob) {
          return;
        }

        const merged = mergeJobDrafts({ jobId, dbJob, localJob });
        if (merged) {
          setJob(merged);
          upsertLocalJob(merged);
        }
      } catch {
        // Local draft fallback keeps the page usable without a DB roundtrip.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDraft();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const roster = useMemo(() => job?.roster ?? [], [job]);
  const sizeTotals = useMemo(() => job?.sizeTotals ?? {}, [job]);
  const parserWarningRows = useMemo(
    () => roster.filter((row) => row.remarks?.toLowerCase().includes("needs_review")),
    [roster]
  );
  const mockupGroups = useMemo(() => {
    const mockupFiles = job?.mockupFiles ?? [];

    return [
      {
        key: "front",
        title: "Front",
        files: mockupFiles.filter((file) => file.role === "front")
      },
      {
        key: "back",
        title: "Back",
        files: mockupFiles.filter((file) => file.role === "back")
      },
      {
        key: "unassigned",
        title: "Unassigned",
        files: mockupFiles.filter((file) => !file.role || file.role === "unassigned")
      }
    ];
  }, [job?.mockupFiles]);

  function updateField(field: EditableProjectField, value: string) {
    setStatusMessage(null);
    setError(null);
    setJob((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateRosterRow(index: number, field: "name" | "number" | "size" | "qty" | "remarks", value: string) {
    setStatusMessage(null);
    setError(null);
    setJob((current) => {
      if (!current) return current;

      const nextRoster = current.roster.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]:
                field === "qty" ? Math.max(1, Number.parseInt(value || "1", 10) || 1) : value
            }
          : row
      );

      return {
        ...current,
        roster: nextRoster,
        sizeTotals: buildSizeTotals(nextRoster)
      };
    });
  }

  function addRosterRow() {
    setStatusMessage(null);
    setError(null);
    setJob((current) => {
      if (!current) return current;
      const nextRoster = [
        ...current.roster,
        { rowNumber: current.roster.length + 1, name: "", number: "", size: "", qty: 1, remarks: "" }
      ];

      return {
        ...current,
        roster: nextRoster,
        sizeTotals: buildSizeTotals(nextRoster)
      };
    });
  }

  function removeRosterRow(index: number) {
    setStatusMessage(null);
    setError(null);
    setJob((current) => {
      if (!current) return current;
      const nextRoster = current.roster
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, rowNumber: rowIndex + 1 }));

      return {
        ...current,
        roster: nextRoster,
        sizeTotals: buildSizeTotals(nextRoster)
      };
    });
  }

  function updateItemSectionFileLabel(itemIndex: number, fileIndex: number, nextLabel: SectionFileLabel) {
    setStatusMessage(null);
    setError(null);
    setJob((current) => {
      if (!current) return current;

      const nextItems =
        current.items?.map((item, currentItemIndex) => {
          if (currentItemIndex !== itemIndex) {
            return item;
          }

          return {
            ...item,
            sectionFiles: (item.sectionFiles ?? []).map((file, currentFileIndex) =>
              currentFileIndex === fileIndex ? { ...file, chosenLabel: nextLabel } : file
            )
          };
        }) ?? [];

      return {
        ...current,
        items: nextItems
      };
    });
  }

  async function onSave() {
    if (!job) return;

    const localDraft: LocalJobDraft = {
      ...job,
      roster: job.roster.map((row, index) => ({ ...row, rowNumber: index + 1 })),
      sizeTotals: buildSizeTotals(job.roster)
    };

    upsertLocalJob(localDraft);
    setJob(localDraft);
    setIsSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectName: localDraft.projectName,
          placementNote: localDraft.placementNote ?? "",
          customerName: localDraft.customerName ?? "",
          category: localDraft.category ?? "",
          sizeLabel: localDraft.sizeLabel ?? "",
          dateLabel: localDraft.dateLabel ?? "",
          cuttingType: localDraft.cuttingType ?? "",
          material: localDraft.material ?? "",
          collarType: localDraft.collarType ?? "",
          sourceMessage: localDraft.sourceMessage ?? "",
          productionNotes: localDraft.productionNotes ?? "",
          items: localDraft.items ?? [],
          roster: localDraft.roster
        })
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ? `Saved locally. ${body.error}` : `Saved locally. Request failed (${response.status})`);
        return;
      }

      setStatusMessage("Saved review changes.");
    } catch (saveError) {
      setError(saveError instanceof Error ? `Saved locally. ${saveError.message}` : "Saved locally only.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!job && !isLoading) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="Job not found"
          description="This job isn't available in local storage. Create a new job first."
          action={
            <Link href="/jobs/new" className="rounded-md bg-black px-4 py-3 text-white">
              New job
            </Link>
          }
        />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-neutral-600 shadow-sm">
        Loading review draft...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Project</p>
        <p className="mt-2 text-sm text-neutral-600">
          Review and edit project details plus roster rows before generation.
        </p>
        {job.mockupFiles?.length ? (
          <p className="mt-2 text-sm text-neutral-600">{job.mockupFiles.length} mockup image(s) attached</p>
        ) : null}
        {job.logoFiles?.length ? (
          <p className="mt-1 text-sm text-neutral-600">{job.logoFiles.length} logo file(s) attached</p>
        ) : null}
      </div>

      {job ? (
        <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Project name</span>
            <input
              value={job.projectName}
              onChange={(event) => updateField("projectName", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Brand name</span>
            <input
              value={job.brandName ?? ""}
              onChange={(event) => updateField("brandName", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Customer name</span>
            <input
              value={job.customerName ?? ""}
              onChange={(event) => updateField("customerName", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <input
              value={job.category ?? ""}
              onChange={(event) => updateField("category", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Cutting</span>
            <input
              value={job.cuttingType ?? ""}
              onChange={(event) => updateField("cuttingType", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Material</span>
            <input
              value={job.material ?? ""}
              onChange={(event) => updateField("material", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Collar type</span>
            <input
              value={job.collarType ?? ""}
              onChange={(event) => updateField("collarType", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Size label</span>
            <input
              value={job.sizeLabel ?? ""}
              onChange={(event) => updateField("sizeLabel", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Date</span>
            <input
              type="date"
              value={job.dateLabel ?? ""}
              onChange={(event) => updateField("dateLabel", event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Placement note</span>
            <textarea
              value={job.placementNote ?? ""}
              onChange={(event) => updateField("placementNote", event.target.value)}
              className="min-h-24 w-full rounded-md border px-3 py-2"
              placeholder="Example: left chest logo, sponsor centered on front"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Production notes</span>
            <textarea
              value={job.productionNotes ?? ""}
              onChange={(event) => updateField("productionNotes", event.target.value)}
              className="min-h-24 w-full rounded-md border px-3 py-2"
            />
          </label>
        </div>
      ) : null}

      {job.mockupFiles?.length ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Mockups</h2>
              <p className="mt-1 text-sm text-neutral-600">Grouped automatically by filename role detection.</p>
            </div>
            <p className="text-sm text-neutral-500">{job.mockupFiles.length} file(s)</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {mockupGroups.map((group) => (
              <section key={group.key} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">{group.title}</h3>
                  <span className="text-xs text-neutral-500">{group.files.length}</span>
                </div>
                {group.files.length ? (
                  <div className="mt-3 space-y-3">
                    {group.files.map((file) => (
                      <div key={`${group.key}-${file.name}`} className="overflow-hidden rounded-lg border bg-neutral-50">
                        <div className="relative aspect-[4/3] bg-white">
                          <Image
                            src={file.dataUrl}
                            alt={file.name}
                            fill
                            sizes="(min-width: 1024px) 30vw, 100vw"
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <p className="border-t bg-white px-3 py-2 text-xs text-neutral-600">{file.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-neutral-500">No {group.title.toLowerCase()} mockups.</p>
                )}
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {job.artworkFiles?.length ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Artwork files</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Artwork for proofing. PDF pages appear as-is; images centred on page.
              </p>
            </div>
            <p className="text-sm text-neutral-500">{job.artworkFiles.length} file(s)</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {job.artworkFiles.map((file) => (
              <div key={file.name} className="overflow-hidden rounded-lg border bg-neutral-50">
                <div className="relative aspect-[4/3] bg-white">
                  <Image
                    src={file.dataUrl}
                    alt={file.name}
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <p className="border-t bg-white px-3 py-2 text-xs text-neutral-600">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {job.items?.length ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Order items</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Section mockups override the shared mockup. Artwork cut pieces and color confirmation are section-only.
            </p>
          </div>
          <div className="space-y-4">
            {job.items.map((item, index) => (
              <ItemSectionCard
                key={`${item.name || "item"}-${index}`}
                item={item}
                onSectionFileChosenLabelChange={(fileIndex, nextLabel) =>
                  updateItemSectionFileLabel(index, fileIndex, nextLabel)
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <SizeTotalsCard totals={sizeTotals} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Roster</h2>
          <button
            type="button"
            onClick={addRosterRow}
            className="rounded-md border px-3 py-2 text-sm font-medium"
            disabled={!job}
          >
            Add row
          </button>
        </div>
        {parserWarningRows.length ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Parser warnings detected</p>
            <p className="mt-1">
              {parserWarningRows.length} row(s) were marked for review. Check highlighted rows before saving.
            </p>
          </div>
        ) : null}
        {roster.length ? (
          roster.map((row, index) => (
            <div
              key={row.rowNumber}
              className={`grid gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                row.remarks?.toLowerCase().includes("needs_review") ? "border-amber-300 bg-amber-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Row {row.rowNumber}</p>
                  {row.remarks?.toLowerCase().includes("needs_review") ? (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-800">
                      Needs review
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeRosterRow(index)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              </div>
              {row.remarks?.toLowerCase().includes("needs_review") ? (
                <p className="text-sm text-amber-900">
                  This row could not be parsed confidently. Confirm the name, number, size, and remarks.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-2 lg:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Name</span>
                  <input
                    value={row.name}
                    onChange={(event) => updateRosterRow(index, "name", event.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Number</span>
                  <input
                    value={row.number}
                    onChange={(event) => updateRosterRow(index, "number", event.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Size</span>
                  <input
                    value={row.size}
                    onChange={(event) => updateRosterRow(index, "size", event.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(event) => updateRosterRow(index, "qty", event.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Remarks</span>
                <input
                  value={row.remarks}
                  onChange={(event) => updateRosterRow(index, "remarks", event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-600">No roster rows detected.</p>
        )}
      </div>

      {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!job || isSaving}
          className="rounded-md border border-black px-4 py-3 text-center font-medium text-black disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
        >
          {isSaving ? "Saving..." : "Save review changes"}
        </button>
        <Link href={`/jobs/${jobId}/generate`} className="block rounded-md bg-black px-4 py-3 text-center text-white">
          Continue to generation
        </Link>
      </div>
    </div>
  );
}
