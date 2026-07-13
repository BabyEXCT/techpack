import { describe, expect, it } from "vitest";
import { PDFArray, PDFDocument, type PDFPage } from "pdf-lib";
import { decodePDFRawStream } from "pdf-lib/cjs/core";
import { buildTechpackPdf } from "../techpack-template";

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8k1sAAAAASUVORK5CYII=";

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

describe("buildTechpackPdf", () => {
  it("renders placement note and role labels on both the tech pack and artwork confirmation pages", async () => {
    const pdfBytes = await buildTechpackPdf({
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      category: "Sublimation",
      customerName: "Golden BC",
      placementNote: "Left chest",
      mockupFiles: [
        {
          name: "front.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
          role: "front"
        },
        {
          name: "back.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
          role: "back"
        }
      ]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    expect(pdf.getPageCount()).toBe(2);

    const techpackText = getPageText(pdf.getPage(0));
    expect(techpackText).toContain("PLACEMENT NOTE");
    expect(techpackText).toContain("Left chest");
    expect(techpackText).toContain("FRONT");
    expect(techpackText).toContain("BACK");

    const artworkText = getPageText(pdf.getPage(1));
    expect(artworkText).toContain("PLACEMENT NOTE");
    expect(artworkText).toContain("Left chest");
    expect(artworkText).toContain("FRONT");
    expect(artworkText).toContain("BACK");
  });

  it("renders UNASSIGNED role labels when mockup files have no role", async () => {
    const pdfBytes = await buildTechpackPdf({
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      mockupFiles: [
        {
          name: "mockup.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
        }
      ]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    expect(pdf.getPageCount()).toBe(2);
    expect(getPageText(pdf.getPage(0))).toContain("UNASSIGNED");
    expect(getPageText(pdf.getPage(1))).toContain("UNASSIGNED");
  });

  it("renders the item section label when provided", async () => {
    const pdfBytes = await buildTechpackPdf({
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      itemName: "Muslimah",
      mockupFiles: [
        {
          name: "mockup.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
        }
      ]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    expect(getPageText(pdf.getPage(0))).toContain("ITEM SECTION");
    expect(getPageText(pdf.getPage(0))).toContain("Muslimah");
    expect(getPageText(pdf.getPage(1))).toContain("ITEM SECTION");
    expect(getPageText(pdf.getPage(1))).toContain("Muslimah");
  });

  it("renders section artwork cut pieces and color confirmation on dedicated pages", async () => {
    const pdfBytes = await buildTechpackPdf({
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      itemName: "Polo",
      mockupFiles: [
        {
          name: "mockup.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
          role: "front"
        }
      ],
      artworkCutPieces: [
        {
          name: "polo-cut-piece.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
        }
      ],
      colorConfirmationFiles: [
        {
          name: "polo-color.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
        }
      ]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    expect(pdf.getPageCount()).toBe(4);
    expect(getPageText(pdf.getPage(2))).toContain("ARTWORK CUT PIECES");
    expect(getPageText(pdf.getPage(2))).toContain("polo-cut-piece.png");
    expect(getPageText(pdf.getPage(3))).toContain("COLOR CONFIRMATION");
    expect(getPageText(pdf.getPage(3))).toContain("polo-color.png");
  });
});
