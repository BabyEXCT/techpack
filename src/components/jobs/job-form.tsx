"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { editableJobDraftSchema } from "@/lib/jobs/editable-job";
import { createJobSchema } from "@/lib/jobs/job-schema";
import { parseWhatsAppOrder } from "@/lib/jobs/parse-whatsapp";
import { getLocalJob, type LocalAssetFile, upsertLocalJob } from "@/lib/jobs/local-jobs";

function formatLocalDateYYYYMMDD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function toLocalFiles(files: File[]) {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      dataUrl: await fileToDataUrl(file)
    }))
  );
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}

async function stateFilesToFiles(files: LocalAssetFile[]): Promise<File[]> {
  return Promise.all(files.map((f) => dataUrlToFile(f.dataUrl, f.name)));
}

async function uploadFiles(jobId: string, kind: "MOCKUP" | "LOGO" | "ARTWORK", files: File[]) {
  if (!files.length) return;

  const form = new FormData();
  form.set("kind", kind);
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch(`/api/jobs/${jobId}/files`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to upload ${kind.toLowerCase()} files`);
  }
}

type CustomerOption = {
  id: string;
  name: string;
};

export function JobForm({ editJobId }: { editJobId?: string }) {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [category, setCategory] = useState("Sublimation");
  const [sizeLabel, setSizeLabel] = useState("");
  const [dateLabel, setDateLabel] = useState(() => formatLocalDateYYYYMMDD(new Date()));
  const [cuttingType, setCuttingType] = useState("");
  const [material, setMaterial] = useState("");
  const [collarType, setCollarType] = useState("");
  const [sourceMessage, setSourceMessage] = useState("");
  const [mockupFiles, setMockupFiles] = useState<LocalAssetFile[]>([]);
  const [artworkFiles, setArtworkFiles] = useState<LocalAssetFile[]>([]);
  const [logoFiles, setLogoFiles] = useState<LocalAssetFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(projectName.trim()), [projectName]);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      if (typeof fetch !== "function") return;

      try {
        const response = await fetch("/api/customers", { cache: "no-store" });
        const body = response.ok ? await response.json() : [];

        if (!isMounted) return;

        setCustomers(
          Array.isArray(body)
            ? body.map((customer) => ({
                id: String(customer.id),
                name: String(customer.name)
              }))
            : []
        );
      } catch {
        if (isMounted) {
          setCustomers([]);
        }
      }
    }

    void loadCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editJobId) return;

    const existingDraft = getLocalJob(editJobId);
    if (!existingDraft) return;

    setProjectName(existingDraft.projectName ?? "");
    setBrandName(existingDraft.brandName ?? "");
    setCategory(existingDraft.category ?? "Sublimation");
    setSizeLabel(existingDraft.sizeLabel ?? "");
    setDateLabel(existingDraft.dateLabel ?? formatLocalDateYYYYMMDD(new Date()));
    setCuttingType(existingDraft.cuttingType ?? "");
    setMaterial(existingDraft.material ?? "");
    setCollarType(existingDraft.collarType ?? "");
    setSourceMessage(existingDraft.sourceMessage ?? "");
    setMockupFiles(existingDraft.mockupFiles ?? []);
    setArtworkFiles(existingDraft.artworkFiles ?? []);
    setLogoFiles(existingDraft.logoFiles ?? []);
  }, [editJobId]);

  useEffect(() => {
    if (!editJobId || !customers.length) return;

    const existingDraft = getLocalJob(editJobId);
    if (!existingDraft?.customerName) return;

    const matchedCustomer = customers.find((customer) => customer.name === existingDraft.customerName);
    if (matchedCustomer) {
      setCustomerId(matchedCustomer.id);
    }
  }, [customers, editJobId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const selectedCustomer = customers.find((customer) => customer.id === customerId);

    const parsedInput = createJobSchema.safeParse({
      projectName,
      customerName: selectedCustomer?.name ?? "",
      customerId: customerId || null,
      category,
      cuttingType,
      material,
      collarType,
      sourceMessage
    });
    if (!parsedInput.success) {
      setError(parsedInput.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsed = parseWhatsAppOrder(sourceMessage);
      const localDraft = {
        id: editJobId ?? "",
        projectName,
        brandName,
        customerName: selectedCustomer?.name ?? "",
        sourceMessage,
        category,
        sizeLabel,
        dateLabel,
        cuttingType,
        material,
        collarType,
        items: parsed.items,
        roster: parsed.roster,
        sizeTotals: parsed.sizeTotals,
        mockupFiles,
        artworkFiles,
        logoFiles,
        createdAt: new Date().toISOString()
      };

      let response: Response;
      let body: unknown;

      if (editJobId) {
        const editableDraft = editableJobDraftSchema.parse({
          projectName,
          brandName,
          customerName: selectedCustomer?.name ?? "",
          category,
          sizeLabel,
          dateLabel,
          cuttingType,
          material,
          collarType,
          sourceMessage,
          productionNotes: "",
          placementNote: "",
          items: parsed.items,
          roster: parsed.roster
        });

        response = await fetch(`/api/jobs/${editJobId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(editableDraft)
        });
        body = await response.json().catch(() => null);
      } else {
        response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsedInput.data)
        });
        body = await response.json().catch(() => null);
      }

      if (!response.ok) {
        setError((body as { error?: string } | null)?.error ?? `Request failed (${response.status})`);
        return;
      }

      const jobId = editJobId ?? String((body as { id: string }).id);

      const selectedMockupFiles = await stateFilesToFiles(mockupFiles);
      const selectedArtworkFiles = await stateFilesToFiles(artworkFiles);
      const selectedLogoFiles = await stateFilesToFiles(logoFiles);

    await Promise.all([
      uploadFiles(jobId, "MOCKUP", selectedMockupFiles),
      uploadFiles(jobId, "ARTWORK", selectedArtworkFiles),
      uploadFiles(jobId, "LOGO", selectedLogoFiles)
    ]);

      upsertLocalJob({
        ...localDraft,
        id: jobId
      });

      router.push(`/jobs/${jobId}/review`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onArtworkChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      setArtworkFiles([]);
      return;
    }

    try {
      const next = await toLocalFiles(files);
      setArtworkFiles(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read artwork files");
    }
  }

  async function onMockupChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    try {
      const next = await toLocalFiles(files);
      setMockupFiles((current) => [...current, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read mockup files");
    }
  }

  async function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      setLogoFiles([]);
      return;
    }

    try {
      const next = await toLocalFiles(files.slice(0, 1));
      setLogoFiles(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read logo file");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Project name</span>
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Kraxtom FC"
          autoComplete="off"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Brand name</span>
        <input
          value={brandName}
          onChange={(event) => setBrandName(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Your brand name"
          autoComplete="off"
        />
      </label>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <label className="block flex-1 space-y-2">
            <span className="text-sm font-medium">Customer</span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <Link
            href="/customers/new"
            className="inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-neutral-800"
          >
            Create new customer
          </Link>
        </div>
        <p className="text-xs text-neutral-500">
          Register the customer first, then come back and link the job to that customer record.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Category</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Sublimation"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Size label</span>
          <input
            value={sizeLabel}
            onChange={(event) => setSizeLabel(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="XS-5XL / Kids / etc"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Date</span>
          <input
            type="date"
            value={dateLabel}
            onChange={(event) => setDateLabel(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="2026-06-16"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Cutting</span>
          <input
            value={cuttingType}
            onChange={(event) => setCuttingType(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Raglan"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Material</span>
          <input
            value={material}
            onChange={(event) => setMaterial(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Mini eyelet 150 GSM"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Collar type</span>
          <input
            value={collarType}
            onChange={(event) => setCollarType(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Retro"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">WhatsApp text</span>
        <textarea
          value={sourceMessage}
          onChange={(event) => setSourceMessage(event.target.value)}
          className="min-h-40 w-full rounded-md border px-3 py-2"
          placeholder="Paste customer message here"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Mockup images</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          data-file-kind="MOCKUP"
          onChange={onMockupChange}
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          Upload front or back mockups so they can be added to the supplier PDF.
        </p>
        {mockupFiles.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {mockupFiles.map((file) => (
              <div key={file.name} className="overflow-hidden rounded-lg border bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="aspect-square w-full object-contain"
                />
                <p className="truncate border-t bg-white px-2 py-1 text-xs text-neutral-600">{file.name}</p>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Artwork files</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          data-file-kind="ARTWORK"
          onChange={onArtworkChange}
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          Upload raw artwork (logos, designs, prints) separate from mockups. Multiple files allowed.
        </p>
        {artworkFiles.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {artworkFiles.map((file) => (
              <div key={file.name} className="overflow-hidden rounded-lg border bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="aspect-square w-full object-contain"
                />
                <p className="truncate border-t bg-white px-2 py-1 text-xs text-neutral-600">{file.name}</p>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Brand logo</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          data-file-kind="LOGO"
          onChange={onLogoChange}
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-neutral-500">Optional logo shown on every supplier PDF page.</p>
        {logoFiles.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {logoFiles.map((file) => (
              <div key={file.name} className="overflow-hidden rounded-lg border bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="aspect-square w-full object-contain"
                />
                <p className="truncate border-t bg-white px-2 py-1 text-xs text-neutral-600">{file.name}</p>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-md bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Saving..." : editJobId ? "Update job draft" : "Save draft job"}
      </button>
    </form>
  );
}
