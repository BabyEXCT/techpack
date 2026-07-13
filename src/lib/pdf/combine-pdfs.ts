import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toPdfSafeText } from "./pdf-text";

type CombinePdfOptions = {
  projectName?: string;
  brandName?: string;
  brandLogoDataUrl?: string;
  sectionLabels?: string[];
};

function hasPolishOptions(options?: CombinePdfOptions) {
  return Boolean(
    options?.projectName?.trim() ||
      options?.brandName?.trim() ||
      options?.brandLogoDataUrl?.trim() ||
      options?.sectionLabels?.some((label) => typeof label === "string" && label.trim())
  );
}

async function embedDataUrlImage(pdf: PDFDocument, dataUrl?: string) {
  if (!dataUrl) return null;
  const [meta, base64] = dataUrl.split(",", 2);
  if (!meta || !base64) return null;
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (meta.includes("image/png")) return pdf.embedPng(bytes);
  if (meta.includes("image/jpeg") || meta.includes("image/jpg")) return pdf.embedJpg(bytes);
  return null;
}

export async function combinePdfBuffers(buffers: Buffer[], options?: CombinePdfOptions) {
  if (!hasPolishOptions(options)) {
    const merged = await PDFDocument.create();

    for (const buffer of buffers) {
      const pdf = await PDFDocument.load(new Uint8Array(buffer));
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      for (const page of pages) {
        merged.addPage(page);
      }
    }

    return Buffer.from(await merged.save());
  }

  const merged = await PDFDocument.create();
  const titleFont = await merged.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await merged.embedFont(StandardFonts.Helvetica);
  const colors = {
    background: rgb(0.99, 0.99, 1),
    border: rgb(0.85, 0.88, 0.92),
    footer: rgb(0.38, 0.44, 0.5),
    header: rgb(0.09, 0.11, 0.15),
    white: rgb(1, 1, 1)
  };

  const sections = await Promise.all(
    buffers.map(async (buffer, index) => {
      const pdf = await PDFDocument.load(new Uint8Array(buffer));
      const rawLabel = options?.sectionLabels?.[index] ?? `Section ${index + 1}`;

      return {
        index,
        label: toPdfSafeText(rawLabel, 48) || `Section ${index + 1}`,
        pdf
      };
    })
  );

  const totalPages = sections.reduce((sum, section) => sum + section.pdf.getPageCount(), 0);
  const projectName = toPdfSafeText(options?.projectName ?? "", 48);
  const brandName = toPdfSafeText(options?.brandName ?? "", 28);
  const brandLogo = await embedDataUrlImage(merged, options?.brandLogoDataUrl);
  let pageNumber = 0;

  for (const section of sections) {
    const sectionTotal = sections.length;

    for (const sourcePage of section.pdf.getPages()) {
      pageNumber += 1;

      const { width, height } = sourcePage.getSize();
      const page = merged.addPage([width, height]);
      const embedded = await merged.embedPage(sourcePage);

      const frameX = 18;
      const frameY = 34;
      const frameWidth = width - frameX * 2;
      const frameHeight = height - 68;
      const headerHeight = 24;
      const footerHeight = 18;
      const contentX = frameX + 6;
      const contentY = frameY + footerHeight + 8;
      const contentWidth = frameWidth - 12;
      const contentHeight = frameHeight - headerHeight - footerHeight - 16;
      const scale = Math.min(contentWidth / embedded.width, contentHeight / embedded.height);
      const scaled = embedded.scale(scale);
      const drawX = contentX + (contentWidth - scaled.width) / 2;
      const drawY = contentY + (contentHeight - scaled.height) / 2;
      const sectionPrefix = `Section ${section.index + 1} of ${sectionTotal}`;
      const pageLabel = `Page ${pageNumber} of ${totalPages}`;
      const projectWidth = projectName ? bodyFont.widthOfTextAtSize(projectName, 10) : 0;
      const pageLabelWidth = bodyFont.widthOfTextAtSize(pageLabel, 9);

      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: colors.background
      });

      page.drawRectangle({
        x: frameX,
        y: frameY,
        width: frameWidth,
        height: frameHeight,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1
      });

      page.drawRectangle({
        x: frameX,
        y: height - frameY - headerHeight,
        width: frameWidth,
        height: headerHeight,
        color: colors.header
      });

      page.drawText(sectionPrefix, {
        x: frameX + 12,
        y: height - frameY - 16,
        size: 10,
        font: titleFont,
        color: colors.white
      });

      page.drawText(section.label, {
        x: frameX + 148,
        y: height - frameY - 16,
        size: 10,
        font: bodyFont,
        color: colors.white
      });

      if (brandName) {
        page.drawText(brandName, {
          x: frameX + 12,
          y: 24,
          size: 10,
          font: titleFont,
          color: colors.footer
        });
      }

      if (brandLogo) {
        const dims = brandLogo.scale(1);
        const ratio = Math.min(14 / dims.width, 14 / dims.height);
        page.drawImage(brandLogo, {
          x: frameX + 12,
          y: height - frameY - 19,
          width: dims.width * ratio,
          height: dims.height * ratio
        });
      }

      if (projectName) {
        page.drawText(projectName, {
          x: Math.max(frameX + 148, width - frameX - projectWidth - 12),
          y: 24,
          size: 10,
          font: bodyFont,
          color: colors.footer
        });
      }

      page.drawText(pageLabel, {
        x: width - frameX - pageLabelWidth - 12,
        y: 24,
        size: 9,
        font: bodyFont,
        color: colors.footer
      });

      page.drawPage(embedded, {
        x: drawX,
        y: drawY,
        width: scaled.width,
        height: scaled.height
      });
    }
  }

  return Buffer.from(await merged.save());
}
