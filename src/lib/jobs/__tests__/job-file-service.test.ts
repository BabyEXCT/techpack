import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  uploadedFileDeleteMany: vi.fn(),
  uploadedFileCreateMany: vi.fn()
}));

const storageMocks = vi.hoisted(() => ({
  save: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    uploadedFile: {
      deleteMany: dbMocks.uploadedFileDeleteMany,
      createMany: dbMocks.uploadedFileCreateMany
    }
  }
}));

vi.mock("@/lib/storage/local-storage", () => ({
  LocalStorageAdapter: vi.fn().mockImplementation(() => ({
    save: storageMocks.save
  }))
}));

import { saveJobFiles } from "../job-file-service";

describe("saveJobFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.uploadedFileDeleteMany.mockResolvedValue({ count: 1 });
    dbMocks.uploadedFileCreateMany.mockResolvedValue({ count: 2 });
    storageMocks.save
      .mockResolvedValueOnce({
        storagePath: "uploads/job_123/front.png",
        originalName: "front.png",
        mimeType: "image/png"
      })
      .mockResolvedValueOnce({
        storagePath: "uploads/job_123/back.png",
        originalName: "back.png",
        mimeType: "image/png"
      });
  });

  it("replaces existing files of the same kind and persists new ones", async () => {
    const files = [
      new File(["front"], "front.png", { type: "image/png" }),
      new File(["back"], "back.png", { type: "image/png" })
    ];

    await saveJobFiles("job_123", "MOCKUP", files);

    expect(dbMocks.uploadedFileDeleteMany).toHaveBeenCalledWith({
      where: { jobId: "job_123", kind: "MOCKUP" }
    });
    expect(storageMocks.save).toHaveBeenCalledTimes(2);
    expect(dbMocks.uploadedFileCreateMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: "job_123",
          kind: "MOCKUP",
          originalName: "front.png",
          storagePath: "uploads/job_123/front.png",
          mimeType: "image/png"
        },
        {
          jobId: "job_123",
          kind: "MOCKUP",
          originalName: "back.png",
          storagePath: "uploads/job_123/back.png",
          mimeType: "image/png"
        }
      ]
    });
  });
});

