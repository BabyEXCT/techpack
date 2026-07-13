"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLocalJob, upsertLocalJob } from "@/lib/jobs/local-jobs";
import type { LocalJobDraft } from "@/lib/jobs/local-jobs";
import { EmptyState } from "@/components/ui/empty-state";
import { mergeJobDrafts } from "@/lib/jobs/editable-job";
import { getMissingRequiredFields } from "@/lib/jobs/required-fields";

type GeneratedFile = {
  key: "combined" | "archive";
  name: string;
  mimeType: string;
  size: number;
  base64: string;
};

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GenerationPanel({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<LocalJobDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ base: string[]; techpack: string[] } | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        // Local draft fallback keeps generation working when DB is unavailable.
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

  const missingBaseLocal = useMemo(() => {
    return getMissingRequiredFields({
      projectName: job?.projectName ?? "",
      category: job?.category ?? "",
      roster: job?.roster ?? []
    });
  }, [job]);

  const missingTechpackLocal = useMemo(() => {
    if (!job) return [];
    const baseMissing = getMissingRequiredFields({
      projectName: job.projectName ?? "",
      category: job.category ?? "",
      roster: job.roster ?? []
    });
    if (baseMissing.length) return baseMissing;
    return job.mockupFiles?.length ? [] : ["mockupFiles"];
  }, [job]);

  useEffect(() => {
    return () => {
      Object.values(downloadUrls).forEach((url) => URL.revokeObjectURL(url));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [downloadUrls, previewUrl]);

  function clearPreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  async function onGenerate() {
    if (!job) return;
    setIsGenerating(true);
    setError(null);
    setMissing(null);
    setFiles([]);
    clearPreview();

    Object.values(downloadUrls).forEach((url) => URL.revokeObjectURL(url));
    setDownloadUrls({});

    try {
      const response = await fetch(`/api/jobs/${jobId}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectName: job.projectName,
          placementNote: job.placementNote ?? "",
          brandName: job.brandName ?? "",
          category: job.category ?? "Sublimation",
          customerName: job.customerName ?? "",
          productionNotes: job.productionNotes ?? "",
          sizeLabel: job.sizeLabel ?? "",
          dateLabel: job.dateLabel ?? "",
          cuttingType: job.cuttingType ?? "",
          material: job.material ?? "",
          collarType: job.collarType ?? "",
          roster: job.roster,
          artworkFiles: [],
          mockupFiles: job.mockupFiles ?? [],
          logoFiles: job.logoFiles ?? []
        })
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMissing(body?.missing ?? null);
        setError(body?.error ?? `Request failed (${response.status})`);
        return;
      }

      setMissing(body?.missing ?? null);
      const nextFiles: GeneratedFile[] = body?.files ?? [];
      setFiles(nextFiles);

      const urls: Record<string, string> = {};
      for (const file of nextFiles) {
        const blob = base64ToBlob(file.base64, file.mimeType);
        urls[file.key] = URL.createObjectURL(blob);
      }
      setDownloadUrls(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function onPreview() {
    if (!job) return;
    setIsPreviewing(true);
    setError(null);
    setMissing(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectName: job.projectName,
          placementNote: job.placementNote ?? "",
          brandName: job.brandName ?? "",
          category: job.category ?? "Sublimation",
          customerName: job.customerName ?? "",
          productionNotes: job.productionNotes ?? "",
          sizeLabel: job.sizeLabel ?? "",
          dateLabel: job.dateLabel ?? "",
          cuttingType: job.cuttingType ?? "",
          material: job.material ?? "",
          collarType: job.collarType ?? "",
          roster: job.roster,
          artworkFiles: [],
          mockupFiles: job.mockupFiles ?? [],
          logoFiles: job.logoFiles ?? []
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setMissing(body?.missing ?? null);
        setError(body?.error ?? `Preview failed (${response.status})`);
        clearPreview();
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
    } catch (err) {
      clearPreview();
      setError(err instanceof Error ? err.message : "Unexpected preview error");
    } finally {
      setIsPreviewing(false);
    }
  }

  if (!job && !isLoading) {
    return (
      <EmptyState
        title="Job not found"
        description="This job isn't available in local storage. Create a new job first."
        action={
          <Link href="/jobs/new" className="rounded-md bg-black px-4 py-3 text-white">
            New job
          </Link>
        }
      />
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-neutral-600 shadow-sm">
        Loading job draft...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Generate outputs</h2>
        <p className="text-sm text-neutral-600">
          Create one combined supplier PDF with the tech pack first and the order sheet after it.
        </p>

        {missingBaseLocal.length ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Missing required fields</p>
            <ul className="mt-2 list-disc pl-5">
              {missingBaseLocal.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!missingBaseLocal.length && missingTechpackLocal.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Tech pack will be skipped until these are added</p>
            <ul className="mt-2 list-disc pl-5">
              {missingTechpackLocal.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {missing?.base?.length ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Server says these fields are missing</p>
            <ul className="mt-2 list-disc pl-5">
              {missing.base.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isPreviewing || Boolean(missingBaseLocal.length)}
            onClick={onPreview}
            className="w-full rounded-md border px-4 py-3 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            {isPreviewing ? "Loading preview..." : "Preview PDF"}
          </button>
          <button
            type="button"
            disabled={isGenerating || Boolean(missingBaseLocal.length)}
            onClick={onGenerate}
            className="w-full rounded-md bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isGenerating ? "Generating..." : "Generate files"}
          </button>
        </div>
      </div>

      {previewUrl ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">PDF preview</h3>
          <iframe
            src={previewUrl}
            className="mt-3 h-[720px] w-full rounded-md border"
            title="Combined PDF preview"
          />
        </div>
      ) : null}

      {files.length ? (
        <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">Downloads</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <a
                key={file.key}
                href={downloadUrls[file.key]}
                download={file.name}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{file.name}</span>
                <span className="text-neutral-500">{formatBytes(file.size)}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
