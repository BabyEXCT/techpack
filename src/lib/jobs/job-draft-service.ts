import { db } from "@/lib/db";
import { loadJobFilesAsDataUrls } from "./job-file-service";
import type { DbJobDraft, EditableJobDraftInput } from "./editable-job";
import { normalizeJobItems, normalizeRosterRows } from "./editable-job";
import { detectMockupRole } from "./mockup-role";

const DRAFT_ITEMS_PREFIX = "[[TPMA_ITEMS:";
const DRAFT_ITEMS_SUFFIX = "]]";
const DRAFT_ITEMS_PATTERN = /\s*\[\[TPMA_ITEMS:([A-Za-z0-9+/=_-]+)\]\]\s*$/;

function toDbJobItems(items: ReturnType<typeof normalizeJobItems>): EditableJobDraftInput["items"] {
  return items.map((item) => ({
    name: item.name ?? "",
    cuttingType: item.cuttingType ?? "",
    collarType: item.collarType ?? "",
    material: item.material ?? "",
    roster: normalizeRosterRows(item.roster ?? []),
    mockupFiles: item.mockupFiles ?? [],
    artworkCutPieces: item.artworkCutPieces ?? [],
    colorConfirmationFiles: item.colorConfirmationFiles ?? [],
    sectionFiles: item.sectionFiles ?? []
  }));
}

function readDraftItemsFromProductionNotes(rawProductionNotes?: string | null) {
  const raw = rawProductionNotes ?? "";
  const match = raw.match(DRAFT_ITEMS_PATTERN);

  if (!match) {
    return {
      productionNotes: raw,
      items: []
    };
  }

  try {
    const decoded = Buffer.from(match[1] ?? "", "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return {
      productionNotes: raw.replace(DRAFT_ITEMS_PATTERN, "").trimEnd(),
      items: toDbJobItems(normalizeJobItems(Array.isArray(parsed) ? parsed : []))
    };
  } catch {
    return {
      productionNotes: raw,
      items: []
    };
  }
}

function writeDraftItemsToProductionNotes(
  rawProductionNotes: string | undefined,
  input: EditableJobDraftInput
) {
  const visibleNotes = (rawProductionNotes ?? "").trimEnd();
  const items = normalizeJobItems(input.items ?? []);

  if (!items.length) {
    return visibleNotes;
  }

  const encodedItems = Buffer.from(JSON.stringify(items), "utf8").toString("base64");
  return `${visibleNotes}${visibleNotes ? "\n\n" : ""}${DRAFT_ITEMS_PREFIX}${encodedItems}${DRAFT_ITEMS_SUFFIX}`;
}

export async function getJobDraftFromDb(jobId: string): Promise<DbJobDraft | null> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { rosterItems: { orderBy: { rowNumber: "asc" } }, files: true }
  });

  if (!job) {
    return null;
  }

  const mockupFiles = await loadJobFilesAsDataUrls(
    (job.files ?? []).filter((file) => file.kind === "MOCKUP")
  );
  const logoFiles = await loadJobFilesAsDataUrls(
    (job.files ?? []).filter((file) => file.kind === "LOGO")
  );
  const { productionNotes, items } = readDraftItemsFromProductionNotes(job.productionNotes);

  return {
    id: job.id,
    projectName: job.projectName,
    placementNote: job.colorNotes ?? "",
    brandName: "",
    customerName: job.customerName ?? "",
    category: job.category ?? "",
    sizeLabel: "",
    dateLabel: "",
    cuttingType: job.cuttingType ?? "",
    material: job.material ?? "",
    collarType: job.collarType ?? "",
    sourceMessage: job.sourceMessage ?? "",
    productionNotes,
    items: items.map((item) => ({
      ...item,
      mockupFiles: item.mockupFiles ?? [],
      artworkCutPieces: item.artworkCutPieces ?? [],
      colorConfirmationFiles: item.colorConfirmationFiles ?? [],
      sectionFiles: item.sectionFiles ?? []
    })),
    roster: normalizeRosterRows(
      job.rosterItems.map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name ?? "",
        number: row.number ?? "",
        size: row.size ?? "",
        remarks: row.remarks ?? ""
      }))
    ),
    mockupFiles: mockupFiles.map((file) => ({
      ...file,
      role: detectMockupRole(file.name)
    })),
    logoFiles,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

export async function updateJobDraft(jobId: string, input: EditableJobDraftInput) {
  const productionNotes = writeDraftItemsToProductionNotes(input.productionNotes, input);
  const items = normalizeJobItems(input.items ?? []);
  const roster = normalizeRosterRows(
    (input.roster?.length ? input.roster : items.flatMap((item) => item.roster)).map((row, index) => ({
      ...row,
      rowNumber: index + 1
    }))
  );

  await db.job.update({
    where: { id: jobId },
    data: {
      projectName: input.projectName,
      customerName: input.customerName,
      category: input.category,
      colorNotes: input.placementNote,
      cuttingType: input.cuttingType,
      material: input.material,
      collarType: input.collarType,
      sourceMessage: input.sourceMessage,
      productionNotes,
      status: "REVIEW_READY"
    }
  });

  await db.rosterItem.deleteMany({
    where: { jobId }
  });

  if (!roster.length) {
    return;
  }

  await db.rosterItem.createMany({
    data: roster.map((row) => ({
      jobId,
      rowNumber: row.rowNumber,
      name: row.name,
      number: row.number,
      size: row.size,
      remarks: row.remarks
    }))
  });
}
