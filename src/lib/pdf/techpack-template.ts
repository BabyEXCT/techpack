import { PDFFont, PDFDocument, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { toPdfSafeText } from "./pdf-text";

const PAGE_W = 595;
const PAGE_H = 842;

type MockupFileInput = {
  name: string;
  dataUrl: string;
  role?: "front" | "back" | "unassigned" | null;
};

export type TechpackJobInput = {
  projectName: string;
  itemName?: string | null;
  brandName?: string | null;
  placementNote?: string | null;
  category?: string | null;
  customerName?: string | null;
  productionNotes?: string | null;
  sizeLabel?: string | null;
  dateLabel?: string | null;
  cuttingType?: string | null;
  material?: string | null;
  collarType?: string | null;
  mockupFiles?: MockupFileInput[];
  artworkCutPieces?: MockupFileInput[];
  colorConfirmationFiles?: MockupFileInput[];
  artworkFiles?: MockupFileInput[];
  logoFiles?: MockupFileInput[];
};

async function embedDataUrlImage(pdf: PDFDocument, dataUrl: string) {
  const [meta, base64] = dataUrl.split(",", 2);
  if (!meta || !base64) return null;

  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (meta.includes("image/png")) return pdf.embedPng(bytes);
  if (meta.includes("image/jpeg") || meta.includes("image/jpg")) return pdf.embedJpg(bytes);
  return null;
}

function formatMockupRoleLabel(role?: MockupFileInput["role"]) {
  switch (role) {
    case "front":
      return "FRONT";
    case "back":
      return "BACK";
    case "unassigned":
      return "UNASSIGNED";
    default:
      return "UNASSIGNED";
  }
}

function drawRoleLabelPill(opts: {
  page: PDFPage;
  x: number;
  y: number;
  label: string;
  font: PDFFont;
}) {
  const { page, x, y, label, font } = opts;
  const fontSize = 10;
  const padX = 6;
  const padY = 3;
  const pillH = fontSize + padY * 2;
  const pillW = font.widthOfTextAtSize(label, fontSize) + padX * 2;

  page.drawRectangle({
    x,
    y,
    width: pillW,
    height: pillH,
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  page.drawText(label, {
    x: x + padX,
    y: y + padY,
    size: fontSize,
    font,
    color: rgb(1, 1, 1)
  });
}

function drawGridBackground(opts: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
  height: number;
  spacing: number;
}) {
  const { page, x, y, width, height, spacing } = opts;
  const lineColor = rgb(0.93, 0.95, 0.98);
  const strokeWidth = 0.5;

  for (let gx = x; gx <= x + width; gx += spacing) {
    page.drawLine({
      start: { x: gx, y },
      end: { x: gx, y: y + height },
      thickness: strokeWidth,
      color: lineColor
    });
  }

  for (let gy = y; gy <= y + height; gy += spacing) {
    page.drawLine({
      start: { x, y: gy },
      end: { x: x + width, y: gy },
      thickness: strokeWidth,
      color: lineColor
    });
  }
}

function drawLabeledBox(opts: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: string;
  labelFont: PDFFont;
  valueFont: PDFFont;
}) {
  const { page, x, y, width, height, label, value, labelFont, valueFont } = opts;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(1, 1, 1)
  });

  page.drawText(label, {
    x: x + 10,
    y: y + height - 16,
    size: 10,
    font: labelFont,
    color: rgb(0, 0, 0)
  });

  const safeValue = toPdfSafeText(value, 40) || "-";
  page.drawText(safeValue, {
    x: x + 10,
    y: y + height - 40,
    size: 18,
    font: valueFont,
    color: rgb(0, 0, 0)
  });
}

function drawHeaderBar(opts: {
  page: PDFPage;
  title: string;
  titleFont: PDFFont;
  bodyFont: PDFFont;
  brandName: string;
  itemName: string;
  logo: PDFImage | null;
}) {
  const { page, title, titleFont, bodyFont, brandName, itemName, logo } = opts;
  const pageWidth = 595;
  const pageHeight = 842;
  const headerH = 58;
  const titleSize = 20;
  const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
  const titleX = Math.max(18, (pageWidth - titleWidth) / 2);

  page.drawRectangle({ x: 0, y: pageHeight - headerH, width: pageWidth, height: headerH, color: rgb(0, 0, 0) });
  page.drawText(title, {
    x: titleX,
    y: pageHeight - 38,
    size: titleSize,
    font: titleFont,
    color: rgb(1, 1, 1)
  });

  if (brandName) {
    page.drawText(brandName, {
      x: 18,
      y: pageHeight - 36,
      size: 14,
      font: titleFont,
      color: rgb(1, 1, 1)
    });
  }

  if (itemName) {
    page.drawText(`ITEM SECTION : ${itemName}`, {
      x: 18,
      y: pageHeight - 50,
      size: 10,
      font: bodyFont,
      color: rgb(1, 1, 1)
    });
  }

  if (logo) {
    const dims = logo.scale(1);
    const ratio = Math.min(32 / dims.width, 32 / dims.height);
    page.drawImage(logo, {
      x: pageWidth - 52,
      y: pageHeight - 46,
      width: dims.width * ratio,
      height: dims.height * ratio
    });
  }
}

async function appendAssetGalleryPage(opts: {
  pdf: PDFDocument;
  title: string;
  helperText: string;
  placementNote: string;
  files: MockupFileInput[];
  titleFont: PDFFont;
  bodyFont: PDFFont;
  brandName: string;
  itemName: string;
  logo: PDFImage | null;
}) {
  const { pdf, title, helperText, placementNote, files, titleFont, bodyFont, brandName, itemName, logo } = opts;
  const page = pdf.addPage([595, 842]);
  const pageWidth = 595;

  drawHeaderBar({
    page,
    title,
    titleFont,
    bodyFont,
    brandName,
    itemName,
    logo
  });

  page.drawText(helperText, {
    x: 40,
    y: 745,
    size: 11,
    font: bodyFont,
    color: rgb(0.35, 0.38, 0.42)
  });

  if (placementNote) {
    page.drawText("PLACEMENT NOTE :", {
      x: 40,
      y: 725,
      size: 11,
      font: titleFont,
      color: rgb(0, 0, 0)
    });
    page.drawText(placementNote, {
      x: 170,
      y: 725,
      size: 11,
      font: bodyFont,
      color: rgb(0.25, 0.28, 0.32),
      maxWidth: 385
    });
  }

  const artworkSlots =
    files.length >= 2
      ? [
          { x: 40, y: 270, width: 235, height: 400 },
          { x: 320, y: 270, width: 235, height: 400 }
        ]
      : [{ x: 120, y: 250, width: 355, height: 430 }];

  for (let index = 0; index < Math.min(files.length, artworkSlots.length); index += 1) {
    const file = files[index];
    const slot = artworkSlots[index];
    const roleLabel = formatMockupRoleLabel(file.role);
    const image = await embedDataUrlImage(pdf, file.dataUrl);

    page.drawRectangle({
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1)
    });
    page.drawText(roleLabel, {
      x: slot.x + 12,
      y: slot.y + slot.height - 18,
      size: 10,
      font: titleFont,
      color: rgb(0, 0, 0)
    });
    page.drawText(toPdfSafeText(file.name, 36), {
      x: slot.x + 12,
      y: slot.y + slot.height - 34,
      size: 9,
      font: bodyFont,
      color: rgb(0.4, 0.45, 0.5)
    });

    if (!image) continue;

    const dims = image.scale(1);
    const maxWidth = slot.width - 24;
    const maxHeight = slot.height - 60;
    const ratio = Math.min(maxWidth / dims.width, maxHeight / dims.height);
    page.drawImage(image, {
      x: slot.x + (slot.width - dims.width * ratio) / 2,
      y: slot.y + 18 + (maxHeight - dims.height * ratio) / 2,
      width: dims.width * ratio,
      height: dims.height * ratio
    });
  }

  page.drawRectangle({
    x: 40,
    y: 70,
    width: 515,
    height: 110,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(1, 1, 1)
  });
  page.drawText("PRODUCTION NOTES", {
    x: 52,
    y: 158,
    size: 11,
    font: titleFont
  });
  page.drawText(
    toPdfSafeText(helperText || "Confirm artwork, placement, and colors before production starts.", 180),
    {
      x: 52,
      y: 136,
      size: 10,
      font: bodyFont,
      maxWidth: 490
    }
  );
}

function dataUrlIsPdf(dataUrl: string) {
  return dataUrl.startsWith("data:application/pdf");
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64] = dataUrl.split(",", 2);
  if (!base64) return null;
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function appendImagePage(opts: {
  pdf: PDFDocument;
  title: string;
  file: MockupFileInput;
  titleFont: PDFFont;
  bodyFont: PDFFont;
  brandName: string;
  itemName: string;
  logo: PDFImage | null;
}) {
  const { pdf, title, file, titleFont, bodyFont, brandName, itemName, logo } = opts;
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  drawHeaderBar({
    page,
    title,
    titleFont,
    bodyFont,
    brandName,
    itemName,
    logo
  });

  // File name as subtitle
  page.drawText(toPdfSafeText(file.name, 80), {
    x: 40,
    y: PAGE_H - 90,
    size: 11,
    font: bodyFont,
    color: rgb(0.35, 0.38, 0.42)
  });

  const image = await embedDataUrlImage(pdf, file.dataUrl);
  if (image) {
    const dims = image.scale(1);
    const maxW = PAGE_W - 80;
    const maxH = PAGE_H - 140;
    const ratio = Math.min(maxW / dims.width, maxH / dims.height);
    page.drawImage(image, {
      x: (PAGE_W - dims.width * ratio) / 2,
      y: 50 + (maxH - dims.height * ratio) / 2,
      width: dims.width * ratio,
      height: dims.height * ratio
    });
  }
}

async function appendArtworkPages(opts: {
  pdf: PDFDocument;
  files: MockupFileInput[];
  titleFont: PDFFont;
  bodyFont: PDFFont;
  brandName: string;
  itemName: string;
  logo: PDFImage | null;
}) {
  const { pdf, files, titleFont, bodyFont, brandName, itemName, logo } = opts;

  for (const file of files) {
    // PDF artwork — copy pages directly
    if (dataUrlIsPdf(file.dataUrl)) {
      const bytes = dataUrlToBytes(file.dataUrl);
      if (!bytes) continue;
      try {
        const sourcePdf = await PDFDocument.load(bytes);
        const pageIndices = sourcePdf.getPageIndices();
        const copiedPages = await pdf.copyPages(sourcePdf, pageIndices);
        for (const copiedPage of copiedPages) {
          pdf.addPage(copiedPage);
        }
      } catch {
        // Skip unparseable PDFs
      }
      continue;
    }

    // Image artwork — dedicated page
    await appendImagePage({
      pdf,
      title: "ARTWORK",
      file,
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });
  }
}

export async function buildTechpackPdf(job: TechpackJobInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait in points

  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  const mockupFiles = job.mockupFiles ?? [];
  const artworkCutPieces = job.artworkCutPieces ?? [];
  const colorConfirmationFiles = job.colorConfirmationFiles ?? [];
  const artworkFiles = job.artworkFiles ?? [];
  const logoFiles = job.logoFiles ?? [];
  const brandName = toPdfSafeText(job.brandName ?? "", 28);
  const itemName = job.itemName?.trim() ? toPdfSafeText(job.itemName.trim(), 28) : "";
  const placementNote = job.placementNote?.trim() ? toPdfSafeText(job.placementNote.trim(), 160) : "";
  const logo = logoFiles[0] ? await embedDataUrlImage(pdf, logoFiles[0].dataUrl) : null;

  // If mockups exist, render a supplier-friendly template page where project details and mockups
  // are on the same page (similar to common supplier tech pack formats).
  if (mockupFiles.length) {
    const pageWidth = 595;
    const pageHeight = 842;
    const headerH = 58;

    drawHeaderBar({
      page,
      title: "TECH PACK",
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });

    // Top info boxes (2x2)
    const boxH = 48;
    const boxW = pageWidth / 2;
    const boxTopY = pageHeight - headerH - boxH;
    const boxSecondY = boxTopY - boxH;

    drawLabeledBox({
      page,
      x: 0,
      y: boxTopY,
      width: boxW,
      height: boxH,
      label: "PROJECT NAME :",
      value: job.projectName,
      labelFont: titleFont,
      valueFont: titleFont
    });
    drawLabeledBox({
      page,
      x: boxW,
      y: boxTopY,
      width: boxW,
      height: boxH,
      label: "CATEGORY :",
      value: job.category ?? "Sublimation",
      labelFont: titleFont,
      valueFont: titleFont
    });
    drawLabeledBox({
      page,
      x: 0,
      y: boxSecondY,
      width: boxW,
      height: boxH,
      label: "SIZE :",
      value: job.sizeLabel ?? "",
      labelFont: titleFont,
      valueFont: titleFont
    });
    drawLabeledBox({
      page,
      x: boxW,
      y: boxSecondY,
      width: boxW,
      height: boxH,
      label: "DATE :",
      value: job.dateLabel ?? "",
      labelFont: titleFont,
      valueFont: titleFont
    });

    // Content area background grid
    const contentX = 0;
    const contentY = 110;
    const contentW = pageWidth;
    const contentH = boxSecondY - contentY;
    drawGridBackground({ page, x: contentX, y: contentY, width: contentW, height: contentH, spacing: 30 });

    if (placementNote) {
      page.drawText("PLACEMENT NOTE :", {
        x: 40,
        y: boxSecondY - 34,
        size: 11,
        font: titleFont,
        color: rgb(0, 0, 0)
      });
      page.drawText(placementNote, {
        x: 170,
        y: boxSecondY - 34,
        size: 11,
        font: bodyFont,
        color: rgb(0.25, 0.28, 0.32),
        maxWidth: 385
      });
    }

    // Main mockup slots (use first 2 images as front/back if present)
    const mainY = 230;
    const mainH = 360;
    const gap = 25;
    const slotW = (pageWidth - gap - 80) / 2;
    const slotH = mainH;
    const leftSlot = { x: 40, y: mainY, width: slotW, height: slotH };
    const rightSlot = { x: 40 + slotW + gap, y: mainY, width: slotW, height: slotH };

    const mainSlots = mockupFiles.length >= 2 ? [leftSlot, rightSlot] : [{ x: 140, y: mainY, width: 315, height: slotH }];

    for (let index = 0; index < Math.min(mockupFiles.length, mainSlots.length); index += 1) {
      const file = mockupFiles[index];
      const slot = mainSlots[index];
      const roleLabel = formatMockupRoleLabel(file.role);

      // Slot border (subtle)
      page.drawRectangle({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        borderColor: rgb(0.85, 0.87, 0.9),
        borderWidth: 1,
        color: rgb(1, 1, 1),
        opacity: 0
      });

      drawRoleLabelPill({
        page,
        x: slot.x + 10,
        y: slot.y + slot.height - 20,
        label: roleLabel,
        font: titleFont
      });

      const image = await embedDataUrlImage(pdf, file.dataUrl);
      if (!image) continue;

      const dims = image.scale(1);
      const maxWidth = slot.width;
      const maxHeight = slot.height;
      const ratio = Math.min(maxWidth / dims.width, maxHeight / dims.height);
      const width = dims.width * ratio;
      const height = dims.height * ratio;
      const x = slot.x + (slot.width - width) / 2;
      const y = slot.y + (slot.height - height) / 2;

      page.drawImage(image, { x, y, width, height });
    }

    // Bottom info boxes
    const bottomCutH = 44;
    const bottomRowH = 44;
    const bottomY = 0;

    // Cutting (full width)
    page.drawRectangle({ x: 0, y: bottomY + bottomRowH, width: pageWidth, height: bottomCutH, borderColor: rgb(0, 0, 0), borderWidth: 1, color: rgb(1, 1, 1) });
    page.drawText("CUTTING :", { x: 18, y: bottomY + bottomRowH + 26, size: 12, font: titleFont });
    page.drawText(toPdfSafeText(job.cuttingType ?? "", 30) || "-", { x: 120, y: bottomY + bottomRowH + 26, size: 16, font: titleFont });

    // Material / Collar type (two columns)
    page.drawRectangle({ x: 0, y: bottomY, width: pageWidth / 2, height: bottomRowH, borderColor: rgb(0, 0, 0), borderWidth: 1, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: pageWidth / 2, y: bottomY, width: pageWidth / 2, height: bottomRowH, borderColor: rgb(0, 0, 0), borderWidth: 1, color: rgb(1, 1, 1) });

    page.drawText("MATERIAL :", { x: 18, y: bottomY + 26, size: 12, font: titleFont });
    page.drawText(toPdfSafeText(job.material ?? "", 30) || "-", { x: 130, y: bottomY + 26, size: 14, font: titleFont });

    page.drawText("COLLAR TYPE :", { x: pageWidth / 2 + 18, y: bottomY + 26, size: 12, font: titleFont });
    page.drawText(toPdfSafeText(job.collarType ?? "", 30) || "-", { x: pageWidth / 2 + 160, y: bottomY + 26, size: 14, font: titleFont });

    await appendAssetGalleryPage({
      pdf,
      title: "ARTWORK CONFIRMATION",
      helperText: "Use this page to confirm the mockup visuals before production starts.",
      placementNote,
      files: mockupFiles,
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });

    if (artworkCutPieces.length) {
      await appendAssetGalleryPage({
        pdf,
        title: "ARTWORK CUT PIECES",
        helperText: "Use this page to confirm section-only artwork cut pieces before production starts.",
        placementNote,
        files: artworkCutPieces,
        titleFont,
        bodyFont,
        brandName,
        itemName,
        logo
      });
    }

    if (colorConfirmationFiles.length) {
      await appendAssetGalleryPage({
        pdf,
        title: "COLOR CONFIRMATION",
        helperText: "Use this page to confirm section-only color references before production starts.",
        placementNote,
        files: colorConfirmationFiles,
        titleFont,
        bodyFont,
        brandName,
        itemName,
        logo
      });
    }

    // One page per mockup image (each with MOCKUP title)
    for (const file of mockupFiles) {
      await appendImagePage({
        pdf,
        title: "MOCKUP",
        file,
        titleFont,
        bodyFont,
        brandName,
        itemName,
        logo
      });
    }

    // Artwork files — PDF pages copied directly, images on dedicated pages
    await appendArtworkPages({
      pdf,
      files: artworkFiles,
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });

    return Buffer.from(await pdf.save());
  }

  // Fallback: text-only page (no mockups)
  page.drawText("Supplier Tech Pack", {
    x: 40,
    y: 790,
    size: 22,
    font: titleFont,
    color: rgb(0, 0, 0)
  });
  if (itemName) {
    page.drawText(`ITEM SECTION : ${itemName}`, {
      x: 40,
      y: 764,
      size: 11,
      font: titleFont,
      color: rgb(0, 0, 0)
    });
  }

  const lines: Array<[string, string]> = [
    ["Project", toPdfSafeText(job.projectName, 60)],
    ["Customer", toPdfSafeText(job.customerName ?? "", 60)],
    ["Category", toPdfSafeText(job.category ?? "Sublimation", 60)]
  ];

  let y = 750;
  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: 40, y, size: 12, font: titleFont });
    page.drawText(value || "-", { x: 140, y, size: 12, font: bodyFont });
    y -= 20;
  }

  if (job.productionNotes?.trim()) {
    y -= 10;
    page.drawText("Production notes:", { x: 40, y, size: 12, font: titleFont });
    y -= 18;
    page.drawText(toPdfSafeText(job.productionNotes.trim(), 350), {
      x: 40,
      y,
      size: 11,
      font: bodyFont,
      maxWidth: 515
    });
  }

  if (artworkCutPieces.length) {
    await appendAssetGalleryPage({
      pdf,
      title: "ARTWORK CUT PIECES",
      helperText: "Use this page to confirm section-only artwork cut pieces before production starts.",
      placementNote,
      files: artworkCutPieces,
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });
  }

  if (colorConfirmationFiles.length) {
    await appendAssetGalleryPage({
      pdf,
      title: "COLOR CONFIRMATION",
      helperText: "Use this page to confirm section-only color references before production starts.",
      placementNote,
      files: colorConfirmationFiles,
      titleFont,
      bodyFont,
      brandName,
      itemName,
      logo
    });
  }

  await appendArtworkPages({
    pdf,
    files: artworkFiles,
    titleFont,
    bodyFont,
    brandName,
    itemName,
    logo
  });

  return Buffer.from(await pdf.save());
}
