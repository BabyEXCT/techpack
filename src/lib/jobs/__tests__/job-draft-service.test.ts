import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  jobFindUnique: vi.fn(),
  jobUpdate: vi.fn(),
  rosterDeleteMany: vi.fn(),
  rosterCreateMany: vi.fn()
}));

const fileServiceMocks = vi.hoisted(() => ({
  loadJobFilesAsDataUrls: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      findUnique: dbMocks.jobFindUnique,
      update: dbMocks.jobUpdate
    },
    rosterItem: {
      deleteMany: dbMocks.rosterDeleteMany,
      createMany: dbMocks.rosterCreateMany
    }
  }
}));

vi.mock("../job-file-service", () => ({
  loadJobFilesAsDataUrls: fileServiceMocks.loadJobFilesAsDataUrls
}));

import { getJobDraftFromDb, updateJobDraft } from "../job-draft-service";

describe("updateJobDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.jobFindUnique.mockResolvedValue(null);
    dbMocks.jobUpdate.mockResolvedValue({ id: "job_123" });
    dbMocks.rosterDeleteMany.mockResolvedValue({ count: 2 });
    dbMocks.rosterCreateMany.mockResolvedValue({ count: 2 });
    fileServiceMocks.loadJobFilesAsDataUrls.mockImplementation(async (files: Array<{ originalName: string }>) =>
      files.map((file) => ({
        name: file.originalName,
        dataUrl: `data:${file.originalName}`
      }))
    );
  });

  it("updates job fields and replaces roster rows in the database", async () => {
    await updateJobDraft("job_123", {
      projectName: "Kraxtom FC",
      customerName: "Kraxtom",
      category: "Sublimation",
      sizeLabel: "Adult",
      dateLabel: "2026-06-16",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "V-neck",
      sourceMessage: "Azlan 14 M",
      placementNote: "left chest logo, sponsor center",
      productionNotes: "Use gold thread",
      roster: [
        { rowNumber: 1, name: "Azlan", number: "14", size: "M", qty: 2, remarks: "Captain" },
        { rowNumber: 2, name: "Iwan", number: "24", size: "L", qty: 1, remarks: "" }
      ]
    });

    expect(dbMocks.jobUpdate).toHaveBeenCalledWith({
      where: { id: "job_123" },
      data: {
        projectName: "Kraxtom FC",
        customerName: "Kraxtom",
        category: "Sublimation",
        cuttingType: "Raglan",
        material: "Mini eyelet",
        collarType: "V-neck",
        colorNotes: "left chest logo, sponsor center",
        sourceMessage: "Azlan 14 M",
        productionNotes: "Use gold thread",
        status: "REVIEW_READY"
      }
    });

    expect(dbMocks.rosterDeleteMany).toHaveBeenCalledWith({
      where: { jobId: "job_123" }
    });

    expect(dbMocks.rosterCreateMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: "job_123",
          rowNumber: 1,
          name: "Azlan",
          number: "14",
          size: "M",
          remarks: "Captain"
        },
        {
          jobId: "job_123",
          rowNumber: 2,
          name: "Iwan",
          number: "24",
          size: "L",
          remarks: ""
        }
      ]
    });
  });

  it("skips roster insert when no rows are provided", async () => {
    await updateJobDraft("job_123", {
      projectName: "Kraxtom FC",
      category: "Sublimation",
      roster: []
    });

    expect(dbMocks.rosterDeleteMany).toHaveBeenCalled();
    expect(dbMocks.rosterCreateMany).not.toHaveBeenCalled();
  });

  it("serializes section-level item assets into production notes", async () => {
    await updateJobDraft("job_123", {
      projectName: "Kraxtom FC",
      productionNotes: "Use gold thread",
      items: [
        {
          name: "Polo",
          roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }],
          mockupFiles: [{ name: "polo-mockup.png", dataUrl: "data:polo-mockup" }],
          artworkCutPieces: [{ name: "polo-cut-piece.png", dataUrl: "data:polo-cut-piece" }],
          colorConfirmationFiles: [{ name: "polo-color.png", dataUrl: "data:polo-color" }]
        }
      ],
      roster: []
    });

    const updateArg = dbMocks.jobUpdate.mock.calls[0]?.[0];
    expect(updateArg).toBeDefined();

    const serialized = updateArg.data.productionNotes.match(/\[\[TPMA_ITEMS:([A-Za-z0-9+/=_-]+)\]\]$/)?.[1];
    expect(serialized).toBeTruthy();

    const parsed = JSON.parse(Buffer.from(serialized ?? "", "base64").toString("utf8"));
    expect(parsed).toEqual([
      expect.objectContaining({
        name: "Polo",
        mockupFiles: [expect.objectContaining({ name: "polo-mockup.png", dataUrl: "data:polo-mockup" })],
        artworkCutPieces: [
          expect.objectContaining({ name: "polo-cut-piece.png", dataUrl: "data:polo-cut-piece" })
        ],
        colorConfirmationFiles: [expect.objectContaining({ name: "polo-color.png", dataUrl: "data:polo-color" })]
      })
    ]);
  });

  it("serializes section files with detected and chosen labels into production notes", async () => {
    await updateJobDraft("job_123", {
      projectName: "Kraxtom FC",
      productionNotes: "Use gold thread",
      items: [
        {
          name: "Polo",
          roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }],
          sectionFiles: [
            {
              name: "polo-mockup-front.jpg",
              dataUrl: "data:polo-mockup-front",
              detectedLabel: "mockup",
              chosenLabel: "mockup",
              mockupVariant: "front"
            },
            {
              name: "polo-colorcode.jpg",
              dataUrl: "data:polo-colorcode",
              detectedLabel: "colorcode",
              chosenLabel: "colorcode"
            }
          ]
        }
      ],
      roster: []
    });

    const updateArg = dbMocks.jobUpdate.mock.calls[0]?.[0];
    expect(updateArg).toBeDefined();

    const serialized = updateArg.data.productionNotes.match(/\[\[TPMA_ITEMS:([A-Za-z0-9+/=_-]+)\]\]$/)?.[1];
    expect(serialized).toBeTruthy();

    const parsed = JSON.parse(Buffer.from(serialized ?? "", "base64").toString("utf8"));
    expect(parsed).toEqual([
      expect.objectContaining({
        name: "Polo",
        sectionFiles: [
          expect.objectContaining({
            name: "polo-mockup-front.jpg",
            detectedLabel: "mockup",
            chosenLabel: "mockup",
            mockupVariant: "front"
          }),
          expect.objectContaining({
            name: "polo-colorcode.jpg",
            detectedLabel: "colorcode",
            chosenLabel: "colorcode"
          })
        ]
      })
    ]);
  });

  it("loads placement note and infers mockup roles from database drafts", async () => {
    dbMocks.jobFindUnique.mockResolvedValue({
      id: "job_123",
      projectName: "Kraxtom FC",
      customerName: "Kraxtom",
      category: "Sublimation",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "V-neck",
      colorNotes: "left chest logo, sponsor center",
      sourceMessage: "Azlan 14 M",
      productionNotes: "Use gold thread",
      rosterItems: [{ rowNumber: 1, name: "Azlan", number: "14", size: "M", remarks: "Captain" }],
      files: [
        { kind: "MOCKUP", originalName: "jersey-front.png" },
        { kind: "MOCKUP", originalName: "jersey-back.png" },
        { kind: "LOGO", originalName: "club-logo.png" }
      ],
      createdAt: new Date("2026-06-17T00:00:00.000Z"),
      updatedAt: new Date("2026-06-17T01:00:00.000Z")
    });

    const result = await getJobDraftFromDb("job_123");

    expect(result).toMatchObject({
      id: "job_123",
      projectName: "Kraxtom FC",
      placementNote: "left chest logo, sponsor center",
      mockupFiles: [
        {
          name: "jersey-front.png",
          dataUrl: "data:jersey-front.png",
          role: "front"
        },
        {
          name: "jersey-back.png",
          dataUrl: "data:jersey-back.png",
          role: "back"
        }
      ],
      logoFiles: [
        {
          name: "club-logo.png",
          dataUrl: "data:club-logo.png"
        }
      ]
    });
  });

  it("loads serialized item groups into the editable draft", async () => {
    const encodedItems = Buffer.from(
      JSON.stringify([
        {
          name: "Polo",
          cuttingType: "Raglan",
          collarType: "",
          material: "Eyelet",
          roster: [{ rowNumber: 1, name: "ALYAA", number: "11", size: "S", qty: 1, remarks: "" }],
          mockupFiles: [{ name: "polo-mockup.png", dataUrl: "data:polo-mockup" }],
          artworkCutPieces: [{ name: "polo-cut-piece.png", dataUrl: "data:polo-cut-piece" }],
          colorConfirmationFiles: [{ name: "polo-color.png", dataUrl: "data:polo-color" }],
          sectionFiles: [
            {
              name: "polo-mockup-front.jpg",
              dataUrl: "data:polo-mockup-front",
              detectedLabel: "mockup",
              chosenLabel: "mockup",
              mockupVariant: "front"
            },
            {
              name: "polo-colorcode.jpg",
              dataUrl: "data:polo-colorcode",
              detectedLabel: "colorcode",
              chosenLabel: "colorcode"
            }
          ]
        }
      ]),
      "utf8"
    ).toString("base64");

    dbMocks.jobFindUnique.mockResolvedValue({
      id: "job_123",
      projectName: "Kraxtom FC",
      customerName: "Kraxtom",
      category: "Sublimation",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "V-neck",
      colorNotes: "left chest logo, sponsor center",
      sourceMessage: "Mixed order",
      productionNotes: `Use gold thread\n\n[[TPMA_ITEMS:${encodedItems}]]`,
      rosterItems: [{ rowNumber: 1, name: "ALYAA", number: "11", size: "S", remarks: "" }],
      files: [],
      createdAt: new Date("2026-06-17T00:00:00.000Z"),
      updatedAt: new Date("2026-06-17T01:00:00.000Z")
    });

    const result = await getJobDraftFromDb("job_123");

    expect(result).toMatchObject({
      productionNotes: "Use gold thread",
      items: [
        expect.objectContaining({
          name: "Polo",
          cuttingType: "Raglan",
          material: "Eyelet",
          roster: [expect.objectContaining({ name: "ALYAA", number: "11", size: "S" })],
          mockupFiles: [expect.objectContaining({ name: "polo-mockup.png" })],
          artworkCutPieces: [expect.objectContaining({ name: "polo-cut-piece.png" })],
          colorConfirmationFiles: [expect.objectContaining({ name: "polo-color.png" })],
          sectionFiles: [
            expect.objectContaining({
              name: "polo-mockup-front.jpg",
              detectedLabel: "mockup",
              chosenLabel: "mockup",
              mockupVariant: "front"
            }),
            expect.objectContaining({
              name: "polo-colorcode.jpg",
              detectedLabel: "colorcode",
              chosenLabel: "colorcode"
            })
          ]
        })
      ]
    });
  });
});
