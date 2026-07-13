import { describe, expect, it } from "vitest";
import { PDFArray, PDFDocument, type PDFPage } from "pdf-lib";
import { decodePDFRawStream } from "pdf-lib/cjs/core";
import { buildOrderSheetPdf } from "../order-sheet-template";

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

describe("buildOrderSheetPdf", () => {
  it("renders the item section label when provided", async () => {
    const pdfBytes = await buildOrderSheetPdf({
      projectName: "Golden BC",
      itemName: "Muslimah",
      roster: [{ name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" }]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    const text = getPageText(pdf.getPage(0));

    expect(text).toContain("ITEM SECTION");
    expect(text).toContain("Muslimah");
    expect(text).toContain("ALYAA");
  });
});
