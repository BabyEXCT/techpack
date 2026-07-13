import { describe, expect, it, vi } from "vitest";
import { PDFArray, PDFDocument } from "pdf-lib";
import { decodePDFRawStream } from "pdf-lib/cjs/core";
import * as techpackTemplate from "@/lib/pdf/techpack-template";

const dbMocks = vi.hoisted(() => ({
  jobFindUniqueOrThrow: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      findUniqueOrThrow: dbMocks.jobFindUniqueOrThrow
    }
  }
}));

import { POST } from "../route";

type GeneratedFile = {
  key: string;
  mimeType: string;
  base64: string;
};

type GenerateRouteBody = {
  missing: {
    base: string[];
    techpack: string[];
  };
  files: GeneratedFile[];
};

function decodeBase64(base64: string) {
  return Buffer.from(base64, "base64");
}

function decodeHexText(value: string) {
  return Buffer.from(value, "hex").toString("latin1");
}

function getPageText(pdf: PDFDocument, pageIndex: number) {
  const page = pdf.getPage(pageIndex);
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

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8k1sAAAAASUVORK5CYII=";

describe("POST /api/jobs/[jobId]/generate", () => {
  it("prefers database job data over request body when both are available", async () => {
    dbMocks.jobFindUniqueOrThrow.mockResolvedValueOnce({
      id: "job_123",
      projectName: "DB Job",
      category: "Sublimation",
      customerName: "DB Customer",
      productionNotes: "Use DB values",
      rosterItems: [{ name: "Azlan", number: "14", size: "M", remarks: "" }],
      files: [{ id: "file_1", kind: "ARTWORK" }]
    });

    const request = new Request("http://localhost/api/jobs/job_123/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Body Job",
        category: "Training",
        roster: []
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.missing.base).toEqual([]);
  });

  it("generates one combined supplier pdf and a zip from DB job", async () => {
    dbMocks.jobFindUniqueOrThrow.mockResolvedValueOnce({
      id: "job_123",
      projectName: "Kraxtom FC",
      category: "Sublimation",
      customerName: "Kraxtom",
      productionNotes: "Use gold thread",
      rosterItems: [{ name: "Azlan", number: "14", size: "M", remarks: "" }],
      files: [{ id: "file_1", kind: "ARTWORK" }]
    });

    const request = new Request("http://localhost/api/jobs/job_123/generate", { method: "POST" });
    const response = await POST(request, { params: Promise.resolve({ jobId: "job_123" }) });
    const body = (await response.json()) as GenerateRouteBody;

    expect(response.status).toBe(200);
    expect(body.files).toHaveLength(2);
    const combined = body.files.find((file) => file.key === "combined");
    const archive = body.files.find((file) => file.key === "archive");
    const combinedPdf = await PDFDocument.load(new Uint8Array(decodeBase64(combined.base64)));

    expect(combined.mimeType).toBe("application/pdf");
    expect(archive.mimeType).toBe("application/zip");

    expect(decodeBase64(combined.base64).subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(decodeBase64(archive.base64).subarray(0, 2).toString("utf8")).toBe("PK");
    expect(combinedPdf.getPageCount()).toBe(2);
    expect(getPageText(combinedPdf, 0)).toContain("Section 1 of 2");
    expect(getPageText(combinedPdf, 0)).toContain("Supplier Tech Pack");
    expect(getPageText(combinedPdf, 1)).toContain("Section 2 of 2");
    expect(getPageText(combinedPdf, 1)).toContain("Order Sheet");
  });

  it("falls back to body job when DB is unavailable", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));

    const request = new Request("http://localhost/api/jobs/job_456/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Fallback Job",
        category: "Sublimation",
        roster: [{ name: "Iwan", number: "24", size: "L" }],
        artworkFiles: [{}]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_456" }) });
    const body = (await response.json()) as GenerateRouteBody;

    expect(response.status).toBe(200);
    expect(body.files.map((file) => file.key)).toEqual(["combined", "archive"]);
  });

  it("generates a techpack from mockup files even without artwork files", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));

    const request = new Request("http://localhost/api/jobs/job_457/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Mockup Job",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [{ name: "Abu", size: "L", qty: 1 }],
        artworkFiles: [],
        mockupFiles: [
          {
            name: "front.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
          }
        ],
        logoFiles: [
          {
            name: "logo.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
          }
        ]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_457" }) });
    const body = (await response.json()) as GenerateRouteBody;
    const combined = body.files.find((file) => file.key === "combined");
    const pdf = await PDFDocument.load(new Uint8Array(decodeBase64(combined.base64)));

    expect(response.status).toBe(200);
    expect(body.missing.techpack).toEqual([]);
    expect(pdf.getPageCount()).toBe(3);
  });

  it("passes placement note and mockup role metadata into techpack generation", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));
    const techpackSpy = vi.spyOn(techpackTemplate, "buildTechpackPdf");

    const request = new Request("http://localhost/api/jobs/job_458/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Preview Ready Job",
        placementNote: "left chest logo, sponsor center",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [{ name: "Abu", size: "L", qty: 1 }],
        artworkFiles: [],
        mockupFiles: [
          {
            name: "front.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
            role: "front"
          }
        ],
        logoFiles: [
          {
            name: "logo.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
          }
        ]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_458" }) });

    expect(response.status).toBe(200);
    expect(techpackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        placementNote: "left chest logo, sponsor center",
        mockupFiles: [expect.objectContaining({ role: "front" })]
      })
    );
  });

  it("groups mixed-style item output into clearly labeled item sections", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));

    const request = new Request("http://localhost/api/jobs/job_777/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Mixed Job",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [],
        items: [
          {
            name: "Muslimah",
            cuttingType: "Muslimah",
            roster: [{ rowNumber: 1, name: "ALYAA", size: "S", qty: 1, remarks: "" }]
          },
          {
            name: "Polo",
            collarType: "Polo",
            roster: [{ rowNumber: 1, name: "AIMI", size: "M", qty: 1, remarks: "" }]
          }
        ],
        mockupFiles: [
          {
            name: "front.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
            role: "front"
          }
        ],
        logoFiles: [
          {
            name: "logo.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
          }
        ]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_777" }) });
    const body = (await response.json()) as GenerateRouteBody;
    const combined = body.files.find((file) => file.key === "combined");
    const pdf = await PDFDocument.load(new Uint8Array(decodeBase64(combined.base64)));

    expect(response.status).toBe(200);
    expect(pdf.getPageCount()).toBe(6);
    expect(getPageText(pdf, 0)).toContain("Section 1 of 4");
    expect(getPageText(pdf, 0)).toContain("Muslimah - Supplier Tech Pack");
    expect(getPageText(pdf, 2)).toContain("Section 2 of 4");
    expect(getPageText(pdf, 2)).toContain("Muslimah - Order Sheet");
    expect(getPageText(pdf, 3)).toContain("Section 3 of 4");
    expect(getPageText(pdf, 3)).toContain("Polo - Supplier Tech Pack");
    expect(getPageText(pdf, 5)).toContain("Section 4 of 4");
    expect(getPageText(pdf, 5)).toContain("Polo - Order Sheet");
  });

  it("uses section mockups first, shared mockup as fallback, and passes section-only visuals into each techpack", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));
    const techpackSpy = vi.spyOn(techpackTemplate, "buildTechpackPdf");

    const request = new Request("http://localhost/api/jobs/job_section/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Section Job",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [],
        mockupFiles: [
          {
            name: "shared.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
            role: "front"
          }
        ],
        items: [
          {
            name: "Polo",
            mockupFiles: [
              {
                name: "polo.png",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                role: "back"
              }
            ],
            artworkCutPieces: [
              {
                name: "polo-cut.png",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
              }
            ],
            colorConfirmationFiles: [
              {
                name: "polo-color.png",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`
              }
            ],
            roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }]
          },
          {
            name: "Muslimah",
            roster: [{ rowNumber: 1, name: "ALYAA", number: "12", size: "S", qty: 1, remarks: "" }]
          }
        ]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_section" }) });

    expect(response.status).toBe(200);
    expect(techpackSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        itemName: "Polo",
        mockupFiles: [expect.objectContaining({ name: "polo.png", role: "back" })],
        artworkCutPieces: [expect.objectContaining({ name: "polo-cut.png" })],
        colorConfirmationFiles: [expect.objectContaining({ name: "polo-color.png" })]
      })
    );
    expect(techpackSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        itemName: "Muslimah",
        mockupFiles: [expect.objectContaining({ name: "shared.png", role: "front" })],
        artworkCutPieces: [],
        colorConfirmationFiles: []
      })
    );
  });

  it("derives per-section visuals from chosen labels and prefers a combined labeled mockup", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));
    const techpackSpy = vi.spyOn(techpackTemplate, "buildTechpackPdf");

    const request = new Request("http://localhost/api/jobs/job_labeled/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Labeled Section Job",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [],
        mockupFiles: [
          {
            name: "shared-front.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
            role: "front"
          }
        ],
        items: [
          {
            name: "Polo",
            roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }],
            sectionFiles: [
              {
                name: "polo-mockup-front.jpg",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                role: "front",
                detectedLabel: "mockup",
                chosenLabel: "mockup",
                mockupVariant: "front"
              },
              {
                name: "polo-mockup-back.jpg",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                role: "back",
                detectedLabel: "mockup",
                chosenLabel: "mockup",
                mockupVariant: "back"
              },
              {
                name: "polo-mockup-front-back.jpg",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                role: "unassigned",
                detectedLabel: "unknown",
                chosenLabel: "mockup",
                mockupVariant: "combined"
              },
              {
                name: "polo-cutpiece.jpg",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                detectedLabel: "mockup",
                chosenLabel: "cutpiece",
                mockupVariant: "single"
              },
              {
                name: "polo-colorcode.jpg",
                dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
                detectedLabel: "unknown",
                chosenLabel: "colorcode",
                mockupVariant: "single"
              }
            ]
          }
        ]
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_labeled" }) });

    expect(response.status).toBe(200);
    expect(techpackSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        itemName: "Polo",
        mockupFiles: [expect.objectContaining({ name: "polo-mockup-front-back.jpg" })],
        artworkCutPieces: [expect.objectContaining({ name: "polo-cutpiece.jpg" })],
        colorConfirmationFiles: [expect.objectContaining({ name: "polo-colorcode.jpg" })]
      })
    );
  });

  it("returns 400 when required fields are missing", async () => {
    dbMocks.jobFindUniqueOrThrow.mockRejectedValueOnce(new Error("DB offline"));

    const request = new Request("http://localhost/api/jobs/job_999/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "",
        category: "",
        roster: []
      })
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_999" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.missing.base).toEqual(["projectName", "category", "roster"]);
  });
});
