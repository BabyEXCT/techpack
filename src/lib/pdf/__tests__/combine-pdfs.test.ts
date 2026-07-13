import { describe, expect, it } from "vitest";
import { PDFArray, PDFDocument, StandardFonts, type PDFPage } from "pdf-lib";
import { decodePDFRawStream } from "pdf-lib/cjs/core";
import { combinePdfBuffers } from "../combine-pdfs";

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8k1sAAAAASUVORK5CYII=";

async function buildSourcePdf(label: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);

  page.drawText(label, {
    x: 80,
    y: 760,
    size: 24,
    font
  });

  return Buffer.from(await pdf.save());
}

function decodeHexText(value: string) {
  return Buffer.from(value, "hex").toString("latin1");
}

function getPageText(page: PDFPage) {
  const contents = page.node.Contents();
  const streams =
    contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, index) => page.node.context.lookup(contents.get(index)))
      : contents
        ? [contents]
        : [];

  return streams
    .map((stream) => {
      const decoded = decodePDFRawStream(stream).decode();
      const source = Buffer.from(decoded).toString("latin1");

      return Array.from(
        source.matchAll(/<([0-9A-F]+)>\s*Tj|\(([^)]*)\)\s*Tj|<([0-9A-F]+)>\s*TJ|\(([^)]*)\)\s*TJ/gi)
      )
        .map((match) => decodeHexText(match[1] ?? match[3] ?? "") || match[2] || match[4] || "")
        .join(" ");
    })
    .join(" ");
}

describe("combinePdfBuffers", () => {
  it("adds section headers, branding, and page numbering while preserving section order", async () => {
    const techpack = await buildSourcePdf("TECHPACK SOURCE");
    const orderSheet = await buildSourcePdf("ORDER SHEET SOURCE");

    const combinedBytes = await combinePdfBuffers([techpack, orderSheet], {
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      brandLogoDataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
      sectionLabels: ["Supplier Tech Pack", "Order Sheet"]
    });

    const pdf = await PDFDocument.load(new Uint8Array(combinedBytes));

    expect(pdf.getPageCount()).toBe(2);
    expect(getPageText(pdf.getPage(0))).toContain("Section 1 of 2");
    expect(getPageText(pdf.getPage(0))).toContain("Supplier Tech Pack");
    expect(getPageText(pdf.getPage(0))).toContain("Broskyy Sports");
    expect(getPageText(pdf.getPage(0))).toContain("Page 1 of 2");
    expect(getPageText(pdf.getPage(1))).toContain("Section 2 of 2");
    expect(getPageText(pdf.getPage(1))).toContain("Order Sheet");
    expect(getPageText(pdf.getPage(1))).toContain("Broskyy Sports");
    expect(getPageText(pdf.getPage(1))).toContain("Page 2 of 2");
  });
});
