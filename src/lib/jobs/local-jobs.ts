import { buildSizeTotals, type SizeTotals } from "./size-totals";
import type { ParsedOrderItem, ParsedRosterRow } from "./parse-whatsapp";
import type { MockupRole } from "./mockup-role";
import type { ItemAssetSet } from "./item-assets";

export type LocalAssetFile = {
  name: string;
  dataUrl: string;
  role?: MockupRole;
};

export type SectionFileLabel = "mockup" | "cutpiece" | "colorcode" | "unknown";
export type MockupVariant = "front" | "back" | "combined" | "single";

export type SectionUploadedFile = LocalAssetFile & {
  detectedLabel: SectionFileLabel;
  chosenLabel: SectionFileLabel;
  mockupVariant?: MockupVariant;
};

export type LocalJobDraft = {
  id: string;
  projectName: string;
  sourceMessage: string;
  placementNote?: string;
  brandName?: string;
  customerName?: string;
  category?: string;
  sizeLabel?: string;
  dateLabel?: string;
  cuttingType?: string;
  material?: string;
  collarType?: string;
  productionNotes?: string;
  items?: LocalJobItem[];
  roster: ParsedRosterRow[];
  sizeTotals: SizeTotals;
  mockupFiles: LocalAssetFile[];
  artworkFiles?: LocalAssetFile[];
  logoFiles?: LocalAssetFile[];
  createdAt: string;
};

export type LocalJobItem = ParsedOrderItem &
  ItemAssetSet & {
    sectionFiles?: SectionUploadedFile[];
  };

const STORAGE_KEY = "tpma.jobs.v1";
const VALID_MOCKUP_ROLES = new Set<MockupRole>(["front", "back", "unassigned"]);
const VALID_SECTION_FILE_LABELS = new Set<SectionFileLabel>(["mockup", "cutpiece", "colorcode", "unknown"]);
const VALID_MOCKUP_VARIANTS = new Set<MockupVariant>(["front", "back", "combined", "single"]);

function readRaw(): unknown {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function normalizeAssetFiles(files: unknown): LocalAssetFile[] {
  if (!Array.isArray(files)) return [];

  return files.flatMap((file) => {
    if (!file || typeof file !== "object") {
      return [];
    }

    const { name, dataUrl, role } = file as Partial<LocalAssetFile>;

    if (typeof name !== "string" || typeof dataUrl !== "string") {
      return [];
    }

    return [
      {
        name,
        dataUrl,
        role: VALID_MOCKUP_ROLES.has(role as MockupRole) ? (role as MockupRole) : undefined
      }
    ];
  });
}

function normalizeSectionFiles(files: unknown): SectionUploadedFile[] {
  if (!Array.isArray(files)) return [];

  return files.flatMap((file) => {
    if (!file || typeof file !== "object") {
      return [];
    }

    const { name, dataUrl, role, detectedLabel, chosenLabel, mockupVariant } = file as Partial<SectionUploadedFile>;

    if (
      typeof name !== "string" ||
      typeof dataUrl !== "string" ||
      !VALID_SECTION_FILE_LABELS.has(detectedLabel as SectionFileLabel) ||
      !VALID_SECTION_FILE_LABELS.has(chosenLabel as SectionFileLabel)
    ) {
      return [];
    }

    return [
      {
        name,
        dataUrl,
        role: VALID_MOCKUP_ROLES.has(role as MockupRole) ? (role as MockupRole) : undefined,
        detectedLabel: detectedLabel as SectionFileLabel,
        chosenLabel: chosenLabel as SectionFileLabel,
        mockupVariant: VALID_MOCKUP_VARIANTS.has(mockupVariant as MockupVariant)
          ? (mockupVariant as MockupVariant)
          : undefined
      }
    ];
  });
}

function normalizeRosterRows(rows: unknown): ParsedRosterRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row, index) => {
    if (!row || typeof row !== "object") {
      return [];
    }

    const candidate = row as Partial<ParsedRosterRow>;

    return [
      {
        rowNumber:
          typeof candidate.rowNumber === "number" && Number.isFinite(candidate.rowNumber) && candidate.rowNumber > 0
            ? candidate.rowNumber
            : index + 1,
        name: typeof candidate.name === "string" ? candidate.name : "",
        number: typeof candidate.number === "string" ? candidate.number : "",
        size: typeof candidate.size === "string" ? candidate.size : "",
        qty: typeof candidate.qty === "number" && Number.isFinite(candidate.qty) && candidate.qty > 0 ? candidate.qty : 1,
        remarks: typeof candidate.remarks === "string" ? candidate.remarks : ""
      }
    ];
  });
}

function normalizeItems(items: unknown): LocalJobItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<LocalJobItem>;
    const roster = normalizeRosterRows(candidate.roster);

    return [
      {
        name: typeof candidate.name === "string" ? candidate.name : "",
        cuttingType: typeof candidate.cuttingType === "string" ? candidate.cuttingType : "",
        collarType: typeof candidate.collarType === "string" ? candidate.collarType : "",
        material: typeof candidate.material === "string" ? candidate.material : "",
        roster,
        sizeTotals: buildSizeTotals(roster),
        mockupFiles: normalizeAssetFiles(candidate.mockupFiles),
        artworkCutPieces: normalizeAssetFiles(candidate.artworkCutPieces),
        colorConfirmationFiles: normalizeAssetFiles(candidate.colorConfirmationFiles),
        sectionFiles: normalizeSectionFiles(candidate.sectionFiles)
      }
    ];
  });
}

export function loadLocalJobs(): LocalJobDraft[] {
  const raw = readRaw();
  if (!Array.isArray(raw)) return [];
  return raw.map((job) => ({
    ...(job as LocalJobDraft),
    items: normalizeItems((job as LocalJobDraft).items),
    placementNote: typeof (job as LocalJobDraft).placementNote === "string" ? (job as LocalJobDraft).placementNote : "",
    mockupFiles: normalizeAssetFiles((job as LocalJobDraft).mockupFiles),
    artworkFiles: normalizeAssetFiles((job as LocalJobDraft).artworkFiles),
    logoFiles: normalizeAssetFiles((job as LocalJobDraft).logoFiles)
  })) as LocalJobDraft[];
}

export function saveLocalJobs(jobs: LocalJobDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function upsertLocalJob(job: LocalJobDraft) {
  const jobs = loadLocalJobs();
  const next = [job, ...jobs.filter((existing) => existing.id !== job.id)];
  saveLocalJobs(next);
}

export function getLocalJob(jobId: string) {
  const jobs = loadLocalJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}
