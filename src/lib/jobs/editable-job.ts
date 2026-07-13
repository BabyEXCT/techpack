import { z } from "zod";
import { buildSizeTotals } from "./size-totals";
import type { LocalAssetFile, LocalJobDraft, SectionUploadedFile } from "./local-jobs";
import type { ParsedOrderItem, ParsedRosterRow } from "./parse-whatsapp";

const VALID_MOCKUP_ROLES = new Set(["front", "back", "unassigned"] as const);
const VALID_SECTION_FILE_LABELS = new Set(["mockup", "cutpiece", "colorcode", "unknown"] as const);
const VALID_MOCKUP_VARIANTS = new Set(["front", "back", "combined", "single"] as const);

export const editableRosterRowSchema = z.object({
  rowNumber: z.number().int().min(1, "Row number must be at least 1"),
  name: z.string().optional().nullable().default(""),
  number: z.string().optional().nullable().default(""),
  size: z.string().optional().nullable().default(""),
  qty: z.number().int().min(1).optional().nullable(),
  remarks: z.string().optional().nullable().default("")
});

const editableMockupRoleSchema = z
  .enum(["front", "back", "unassigned"])
  .optional()
  .nullable()
  .transform((role) => role ?? undefined);

const editableMockupVariantSchema = z
  .enum(["front", "back", "combined", "single"])
  .optional()
  .nullable()
  .transform((variant) => variant ?? undefined);

const editableAssetFileSchema = z.object({
  name: z.string(),
  dataUrl: z.string(),
  role: editableMockupRoleSchema
});

const editableSectionFileSchema = z.object({
  name: z.string(),
  dataUrl: z.string(),
  role: editableMockupRoleSchema,
  detectedLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  chosenLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  mockupVariant: editableMockupVariantSchema
});

export const editableJobItemSchema = z.object({
  name: z.string().optional().nullable().default(""),
  cuttingType: z.string().optional().nullable().default(""),
  collarType: z.string().optional().nullable().default(""),
  material: z.string().optional().nullable().default(""),
  roster: z.array(editableRosterRowSchema).default([]),
  mockupFiles: z.array(editableAssetFileSchema).default([]),
  artworkCutPieces: z.array(editableAssetFileSchema).default([]),
  colorConfirmationFiles: z.array(editableAssetFileSchema).default([]),
  sectionFiles: z.array(editableSectionFileSchema).default([])
});

export const editableJobDraftSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  placementNote: z.string().optional().default(""),
  brandName: z.string().optional().default(""),
  customerName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  sizeLabel: z.string().optional().default(""),
  dateLabel: z.string().optional().default(""),
  cuttingType: z.string().optional().default(""),
  material: z.string().optional().default(""),
  collarType: z.string().optional().default(""),
  sourceMessage: z.string().optional().default(""),
  productionNotes: z.string().optional().default(""),
  items: z.array(editableJobItemSchema).default([]),
  roster: z.array(editableRosterRowSchema).default([])
});

export type EditableRosterRow = ParsedRosterRow;
export type EditableJobItem = ParsedOrderItem & {
  mockupFiles?: LocalAssetFile[];
  artworkCutPieces?: LocalAssetFile[];
  colorConfirmationFiles?: LocalAssetFile[];
  sectionFiles?: SectionUploadedFile[];
};
export type EditableJobDraftInput = z.infer<typeof editableJobDraftSchema>;
type LooseEditableAssetFile = {
  name?: string | null;
  dataUrl?: string | null;
  role?: "front" | "back" | "unassigned" | null;
};
type LooseEditableSectionFile = LooseEditableAssetFile & {
  detectedLabel?: "mockup" | "cutpiece" | "colorcode" | "unknown" | null;
  chosenLabel?: "mockup" | "cutpiece" | "colorcode" | "unknown" | null;
  mockupVariant?: "front" | "back" | "combined" | "single" | null;
};
type LooseEditableRosterRow = {
  rowNumber?: number | null;
  name?: string | null;
  number?: string | null;
  size?: string | null;
  qty?: number | null;
  remarks?: string | null;
};
type LooseEditableJobItem = {
  name?: string | null;
  cuttingType?: string | null;
  collarType?: string | null;
  material?: string | null;
  roster?: LooseEditableRosterRow[] | null;
  mockupFiles?: LooseEditableAssetFile[] | null;
  artworkCutPieces?: LooseEditableAssetFile[] | null;
  colorConfirmationFiles?: LooseEditableAssetFile[] | null;
  sectionFiles?: LooseEditableSectionFile[] | null;
};

export type DbJobDraft = EditableJobDraftInput & {
  id: string;
  logoFiles?: LocalAssetFile[];
  mockupFiles?: LocalAssetFile[];
  createdAt: string;
  updatedAt: string;
};

function pickPreferred(primary?: string | null, fallback?: string | null) {
  if (typeof primary === "string" && primary.trim()) return primary;
  if (typeof primary === "string" && primary === "") return fallback ?? "";
  return fallback ?? "";
}

function toEditableRosterRow(row: LooseEditableRosterRow, index: number): EditableRosterRow {
  return {
    rowNumber: row.rowNumber && row.rowNumber > 0 ? row.rowNumber : index + 1,
    name: row.name?.trim() ?? "",
    number: row.number?.trim() ?? "",
    size: row.size?.trim() ?? "",
    qty: typeof row.qty === "number" && Number.isFinite(row.qty) && row.qty > 0 ? row.qty : 1,
    remarks: row.remarks?.trim() ?? ""
  };
}

export function normalizeRosterRows(rows: LooseEditableRosterRow[]) {
  return rows.map((row, index) => toEditableRosterRow(row, index));
}

function normalizeAssetFiles(files: LooseEditableAssetFile[] = []): LocalAssetFile[] {
  return files.flatMap((file) => {
    if (typeof file?.name !== "string" || typeof file?.dataUrl !== "string") {
      return [];
    }

    return [
      {
        name: file.name,
        dataUrl: file.dataUrl,
        role: VALID_MOCKUP_ROLES.has(file.role ?? "unassigned") ? file.role ?? undefined : undefined
      }
    ];
  });
}

function normalizeSectionFiles(files: LooseEditableSectionFile[] = []): SectionUploadedFile[] {
  return files.flatMap((file) => {
    if (
      typeof file?.name !== "string" ||
      typeof file?.dataUrl !== "string" ||
      !VALID_SECTION_FILE_LABELS.has(file.detectedLabel ?? "unknown") ||
      !VALID_SECTION_FILE_LABELS.has(file.chosenLabel ?? "unknown")
    ) {
      return [];
    }

    return [
      {
        name: file.name,
        dataUrl: file.dataUrl,
        role: VALID_MOCKUP_ROLES.has(file.role ?? "unassigned") ? file.role ?? undefined : undefined,
        detectedLabel: file.detectedLabel ?? "unknown",
        chosenLabel: file.chosenLabel ?? "unknown",
        mockupVariant: VALID_MOCKUP_VARIANTS.has(file.mockupVariant ?? "single") ? file.mockupVariant ?? undefined : undefined
      }
    ];
  });
}

function toEditableJobItem(item: LooseEditableJobItem): EditableJobItem {
  const roster = normalizeRosterRows(item.roster ?? []);

  return {
    name: item.name?.trim() ?? "",
    cuttingType: item.cuttingType?.trim() ?? "",
    collarType: item.collarType?.trim() ?? "",
    material: item.material?.trim() ?? "",
    roster,
    sizeTotals: buildSizeTotals(roster),
    mockupFiles: normalizeAssetFiles(item.mockupFiles ?? []),
    artworkCutPieces: normalizeAssetFiles(item.artworkCutPieces ?? []),
    colorConfirmationFiles: normalizeAssetFiles(item.colorConfirmationFiles ?? []),
    sectionFiles: normalizeSectionFiles(item.sectionFiles ?? [])
  };
}

export function normalizeJobItems(items: LooseEditableJobItem[]) {
  return items.map((item) => toEditableJobItem(item));
}

function mergeRosterRows(dbRoster: LooseEditableRosterRow[], localRoster: LooseEditableRosterRow[]) {
  const primary = dbRoster.length ? dbRoster : localRoster;
  const fallback = dbRoster.length ? localRoster : [];

  return primary.map((row, index) => {
    const fallbackRow = fallback[index];
    return toEditableRosterRow(
      {
        rowNumber: row.rowNumber ?? fallbackRow?.rowNumber ?? index + 1,
        name: pickPreferred(row.name, fallbackRow?.name),
        number: pickPreferred(row.number, fallbackRow?.number),
        size: pickPreferred(row.size, fallbackRow?.size),
        qty: row.qty ?? fallbackRow?.qty ?? 1,
        remarks: pickPreferred(row.remarks, fallbackRow?.remarks)
      },
      index
    );
  });
}

function mergeJobItems(dbItems: LooseEditableJobItem[], localItems: LooseEditableJobItem[]) {
  const primary = dbItems.length ? dbItems : localItems;
  return normalizeJobItems(primary);
}

export function mergeJobDrafts({
  jobId,
  dbJob,
  localJob
}: {
  jobId: string;
  dbJob?: DbJobDraft | null;
  localJob?: LocalJobDraft | null;
}) {
  if (!dbJob && !localJob) return null;

  const roster = mergeRosterRows(dbJob?.roster ?? [], localJob?.roster ?? []);
  const items = mergeJobItems(dbJob?.items ?? [], localJob?.items ?? []);
  const mockupFiles: LocalAssetFile[] =
    dbJob?.mockupFiles?.length ? dbJob.mockupFiles : localJob?.mockupFiles ?? [];
  const logoFiles: LocalAssetFile[] =
    dbJob?.logoFiles?.length ? dbJob.logoFiles : localJob?.logoFiles ?? [];

  return {
    id: jobId,
    projectName: pickPreferred(dbJob?.projectName, localJob?.projectName),
    placementNote: pickPreferred(dbJob?.placementNote, localJob?.placementNote),
    brandName: pickPreferred(dbJob?.brandName, localJob?.brandName),
    customerName: pickPreferred(dbJob?.customerName, localJob?.customerName),
    category: pickPreferred(dbJob?.category, localJob?.category),
    sizeLabel: pickPreferred(dbJob?.sizeLabel, localJob?.sizeLabel),
    dateLabel: pickPreferred(dbJob?.dateLabel, localJob?.dateLabel),
    cuttingType: pickPreferred(dbJob?.cuttingType, localJob?.cuttingType),
    material: pickPreferred(dbJob?.material, localJob?.material),
    collarType: pickPreferred(dbJob?.collarType, localJob?.collarType),
    sourceMessage: pickPreferred(dbJob?.sourceMessage, localJob?.sourceMessage),
    productionNotes: pickPreferred(dbJob?.productionNotes, localJob?.productionNotes),
    items,
    roster,
    sizeTotals: buildSizeTotals(roster),
    mockupFiles,
    logoFiles,
    createdAt: dbJob?.createdAt ?? localJob?.createdAt ?? new Date().toISOString()
  } satisfies LocalJobDraft;
}
