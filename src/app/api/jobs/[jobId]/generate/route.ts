import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveItemMockup, resolveMockupFiles, splitSectionFilesByLabel } from "@/lib/jobs/item-assets";
import { loadJobFilesAsDataUrls } from "@/lib/jobs/job-file-service";
import { getMissingRequiredFields } from "@/lib/jobs/required-fields";
import { buildArchiveZip } from "@/lib/pdf/archive-bundle";
import { combinePdfBuffers } from "@/lib/pdf/combine-pdfs";
import { buildOrderSheetPdf } from "@/lib/pdf/order-sheet-template";
import { buildTechpackPdf } from "@/lib/pdf/techpack-template";

const rosterRowSchema = z.object({
  name: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  qty: z.number().optional().nullable(),
  remarks: z.string().optional().nullable()
});

const mockupRoleSchema = z
  .enum(["front", "back", "unassigned"])
  .optional()
  .nullable()
  .transform((role) => role ?? undefined);

const mockupVariantSchema = z
  .enum(["front", "back", "combined", "single"])
  .optional()
  .nullable()
  .transform((variant) => variant ?? undefined);

const mockupFileSchema = z.object({
  name: z.string(),
  dataUrl: z.string(),
  role: mockupRoleSchema
});

const sectionFileSchema = mockupFileSchema.extend({
  detectedLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  chosenLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  mockupVariant: mockupVariantSchema
});

const jobItemSchema = z.object({
  name: z.string().optional().nullable(),
  cuttingType: z.string().optional().nullable(),
  collarType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  roster: z.array(rosterRowSchema).optional().default([]),
  mockupFiles: z.array(mockupFileSchema).optional().default([]),
  artworkCutPieces: z.array(mockupFileSchema).optional().default([]),
  colorConfirmationFiles: z.array(mockupFileSchema).optional().default([]),
  sectionFiles: z.array(sectionFileSchema).optional().default([])
});

const jobInputSchema = z.object({
  projectName: z.string(),
  placementNote: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  productionNotes: z.string().optional().nullable(),
  sizeLabel: z.string().optional().nullable(),
  dateLabel: z.string().optional().nullable(),
  cuttingType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  collarType: z.string().optional().nullable(),
  items: z.array(jobItemSchema).optional().default([]),
  roster: z.array(rosterRowSchema).optional().default([]),
  artworkFiles: z.array(mockupFileSchema).optional().default([]),
  mockupFiles: z.array(mockupFileSchema).optional().default([]),
  logoFiles: z.array(mockupFileSchema).optional().default([])
});

type JobItemForGeneration = z.infer<typeof jobItemSchema>;
type JobForGeneration = z.infer<typeof jobInputSchema>;

function bufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

async function readOptionalJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function coerceBodyToJob(body: unknown | null): JobForGeneration | null {
  if (!body || typeof body !== "object") return null;
  const maybeWrapped = (body as { job?: unknown }).job ?? body;
  const parsed = jobInputSchema.safeParse(maybeWrapped);
  return parsed.success ? parsed.data : null;
}

function preferString(primary?: string | null, fallback?: string | null) {
  if (typeof primary === "string" && primary.trim()) return primary;
  return fallback ?? "";
}

async function loadJobFromDb(jobId: string): Promise<JobForGeneration | null> {
  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { rosterItems: true, files: true }
  });

  const artworkFiles = await loadJobFilesAsDataUrls(
    (job.files ?? []).filter((file) => file.kind === "ARTWORK")
  );
  const mockupFiles = await loadJobFilesAsDataUrls(
    (job.files ?? []).filter((file) => file.kind === "MOCKUP")
  );
  const logoFiles = await loadJobFilesAsDataUrls(
    (job.files ?? []).filter((file) => file.kind === "LOGO")
  );

  return {
    projectName: job.projectName,
    placementNote: job.colorNotes ?? "",
    brandName: "",
    category: job.category ?? "",
    customerName: job.customerName ?? "",
    productionNotes: job.productionNotes ?? "",
    sizeLabel: "",
    dateLabel: "",
    cuttingType: job.cuttingType ?? "",
    material: job.material ?? "",
    collarType: job.collarType ?? "",
    items: [],
    roster: (job.rosterItems ?? []).map((row) => ({
      name: row.name,
      number: row.number,
      size: row.size,
      qty: undefined,
      remarks: row.remarks
    })),
    artworkFiles,
    mockupFiles,
    logoFiles
  };
}

function mergeJobs(primary: JobForGeneration | null, fallback: JobForGeneration | null): JobForGeneration | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  const primaryRoster = primary.roster?.length ? primary.roster : fallback.roster;
  const fallbackRoster = fallback.roster ?? [];

  return {
    projectName: preferString(primary.projectName, fallback.projectName),
    placementNote: preferString(primary.placementNote, fallback.placementNote),
    brandName: preferString(primary.brandName, fallback.brandName),
    category: preferString(primary.category, fallback.category),
    customerName: preferString(primary.customerName, fallback.customerName),
    productionNotes: preferString(primary.productionNotes, fallback.productionNotes),
    sizeLabel: preferString(primary.sizeLabel, fallback.sizeLabel),
    dateLabel: preferString(primary.dateLabel, fallback.dateLabel),
    cuttingType: preferString(primary.cuttingType, fallback.cuttingType),
    material: preferString(primary.material, fallback.material),
    collarType: preferString(primary.collarType, fallback.collarType),
    items: primary.items.length ? primary.items : fallback.items,
    roster: (primaryRoster ?? []).map((row, index) => ({
      name: preferString(row.name, fallbackRoster[index]?.name),
      number: preferString(row.number, fallbackRoster[index]?.number),
      size: preferString(row.size, fallbackRoster[index]?.size),
      qty: row.qty ?? fallbackRoster[index]?.qty ?? 1,
      remarks: preferString(row.remarks, fallbackRoster[index]?.remarks)
    })),
    artworkFiles: primary.artworkFiles.length ? primary.artworkFiles : fallback.artworkFiles,
    mockupFiles: primary.mockupFiles.length ? primary.mockupFiles : fallback.mockupFiles,
    logoFiles: primary.logoFiles.length ? primary.logoFiles : fallback.logoFiles
  };
}

function getTechpackVisualMissing(job: JobForGeneration) {
  const hasSectionLevelVisuals = job.items.some(
    (item) => {
      const labeledFiles = splitSectionFilesByLabel(item.sectionFiles ?? []);
      return (
        (item.mockupFiles?.length ?? 0) > 0 ||
        (item.artworkCutPieces?.length ?? 0) > 0 ||
        (item.colorConfirmationFiles?.length ?? 0) > 0 ||
        labeledFiles.mockups.length > 0 ||
        labeledFiles.cutPieces.length > 0 ||
        labeledFiles.colorCodes.length > 0
      );
    }
  );

  return job.artworkFiles.length || job.mockupFiles.length || hasSectionLevelVisuals ? [] : ["mockupFiles"];
}

function getEffectiveRoster(job: JobForGeneration) {
  if (job.roster.length) return job.roster;
  return job.items.flatMap((item) => item.roster);
}

function getEffectiveItems(job: JobForGeneration): JobItemForGeneration[] {
  if (job.items.length) {
    return job.items.map((item) => ({
      name: preferString(item.name, job.category || "Order"),
      cuttingType: preferString(item.cuttingType, job.cuttingType),
      collarType: preferString(item.collarType, job.collarType),
      material: preferString(item.material, job.material),
      roster: item.roster,
      mockupFiles: item.mockupFiles ?? [],
      artworkCutPieces: item.artworkCutPieces ?? [],
      colorConfirmationFiles: item.colorConfirmationFiles ?? [],
      sectionFiles: item.sectionFiles ?? []
    }));
  }

  return [
    {
      name: preferString(job.category, "Order"),
      cuttingType: job.cuttingType,
      collarType: job.collarType,
      material: job.material,
      roster: job.roster,
      mockupFiles: [],
      artworkCutPieces: [],
      colorConfirmationFiles: [],
      sectionFiles: []
    }
  ];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const body = await readOptionalJson(request);
  const jobFromBody = coerceBodyToJob(body);

  let jobFromDb: JobForGeneration | null = null;
  let dbError: string | null = null;

  try {
    jobFromDb = await loadJobFromDb(jobId);
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Unknown database error";
  }

  const job = mergeJobs(jobFromDb, jobFromBody);

  if (!job) {
    return NextResponse.json(
      {
        error: "Job not found. Provide job data in the request body when running without a database.",
        details: dbError
      },
      { status: 404 }
    );
  }

  const isItemizedGeneration = job.items.length > 0;
  const effectiveRoster = getEffectiveRoster(job);
  const effectiveItems = getEffectiveItems(job);
  const missingBase = getMissingRequiredFields({
    projectName: job.projectName,
    category: job.category ?? "",
    roster: effectiveRoster
  });

  const missingTechpack = getTechpackVisualMissing(job);

  if (missingBase.length) {
    return NextResponse.json(
      { error: "Missing required fields", missing: { base: missingBase, techpack: missingTechpack } },
      { status: 400 }
    );
  }

  const files: Array<{
    key: "combined" | "archive";
    name: string;
    mimeType: string;
    size: number;
    base64: string;
  }> = [];

  const orderSheets: Buffer[] = [];
  const combinedSections: Buffer[] = [];
  const sectionLabels: string[] = [];

  if (isItemizedGeneration) {
    for (const item of effectiveItems) {
      const itemName = preferString(item.name, job.category || "Order");
      const labeledFiles = splitSectionFilesByLabel(item.sectionFiles ?? []);
      const derivedMockups = resolveMockupFiles(labeledFiles.mockups);
      const itemMockups = (item.sectionFiles?.length ?? 0) > 0 ? derivedMockups : (item.mockupFiles ?? []);
      const artworkCutPieces =
        (item.sectionFiles?.length ?? 0) > 0 ? labeledFiles.cutPieces : (item.artworkCutPieces ?? []);
      const colorConfirmationFiles =
        (item.sectionFiles?.length ?? 0) > 0 ? labeledFiles.colorCodes : (item.colorConfirmationFiles ?? []);
      const resolvedMockups = resolveItemMockup(itemMockups, job.mockupFiles ?? []);
      const hasSectionVisuals =
        resolvedMockups.length > 0 ||
        artworkCutPieces.length > 0 ||
        colorConfirmationFiles.length > 0;

      if (!missingTechpack.length || hasSectionVisuals) {
        const itemTechpack = await buildTechpackPdf({
          projectName: job.projectName,
          itemName,
          placementNote: job.placementNote,
          brandName: job.brandName,
          category: job.category,
          customerName: job.customerName,
          productionNotes: job.productionNotes,
          sizeLabel: job.sizeLabel,
          dateLabel: job.dateLabel,
          cuttingType: item.cuttingType,
          material: item.material,
          collarType: item.collarType,
          mockupFiles: resolvedMockups,
          artworkCutPieces,
          colorConfirmationFiles,
          artworkFiles: job.artworkFiles,
          logoFiles: job.logoFiles
        });
        combinedSections.push(itemTechpack);
        sectionLabels.push(`${itemName} - Supplier Tech Pack`);
      }

      const itemOrderSheet = await buildOrderSheetPdf({
        projectName: job.projectName,
        itemName,
        roster: item.roster
      });
      orderSheets.push(itemOrderSheet);
      combinedSections.push(itemOrderSheet);
      sectionLabels.push(`${itemName} - Order Sheet`);
    }
  } else {
    const orderSheet = await buildOrderSheetPdf({ projectName: job.projectName, roster: effectiveRoster });
    orderSheets.push(orderSheet);

    let techpack: Buffer | null = null;
    if (!missingTechpack.length) {
      techpack = await buildTechpackPdf({
        projectName: job.projectName,
        placementNote: job.placementNote,
        brandName: job.brandName,
        category: job.category,
        customerName: job.customerName,
        productionNotes: job.productionNotes,
        sizeLabel: job.sizeLabel,
        dateLabel: job.dateLabel,
        cuttingType: job.cuttingType,
        material: job.material,
        collarType: job.collarType,
        mockupFiles: job.mockupFiles,
        artworkFiles: job.artworkFiles,
        logoFiles: job.logoFiles
      });
    }

    if (techpack) {
      combinedSections.push(techpack);
      sectionLabels.push("Supplier Tech Pack");
    }
    combinedSections.push(orderSheet);
    sectionLabels.push("Order Sheet");
  }

  const orderSheet =
    orderSheets.length === 1
      ? orderSheets[0]
      : await combinePdfBuffers(orderSheets, {
          projectName: job.projectName,
          brandName: job.brandName ?? undefined
        });
  const combinedPdf = await combinePdfBuffers(combinedSections, {
    projectName: job.projectName,
    brandName: job.brandName ?? undefined,
    brandLogoDataUrl: job.logoFiles[0]?.dataUrl,
    sectionLabels
  });
  files.push({
    key: "combined",
    name: "supplier-techpack-order-sheet.pdf",
    mimeType: "application/pdf",
    size: combinedPdf.byteLength,
    base64: bufferToBase64(combinedPdf)
  });

  const archive = await buildArchiveZip([
    { name: "supplier-techpack-order-sheet.pdf", data: combinedPdf },
    { name: "order-sheet.pdf", data: orderSheet }
  ]);

  files.push({
    key: "archive",
    name: `job-${jobId}.zip`,
    mimeType: "application/zip",
    size: archive.byteLength,
    base64: bufferToBase64(archive)
  });

  return NextResponse.json(
    {
      jobId,
      generatedAt: new Date().toISOString(),
      missing: { base: missingBase, techpack: missingTechpack },
      files
    },
    { status: 200 }
  );
}
