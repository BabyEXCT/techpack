// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  jobUpdate: vi.fn(),
  jobDelete: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      update: dbMocks.jobUpdate,
      delete: dbMocks.jobDelete
    }
  }
}));

import { DELETE, PATCH, POST } from "../route";

describe("/api/jobs/[jobId]/trash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes a job with DELETE", async () => {
    dbMocks.jobUpdate.mockResolvedValueOnce({ id: "job_123" });

    const response = await DELETE(new Request("http://localhost/api/jobs/job_123/trash"), {
      params: Promise.resolve({ jobId: "job_123" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(dbMocks.jobUpdate).toHaveBeenCalledWith({
      where: { id: "job_123" },
      data: { deletedAt: expect.any(Date) }
    });
  });

  it("restores a job with PATCH", async () => {
    dbMocks.jobUpdate.mockResolvedValueOnce({ id: "job_123" });

    const response = await PATCH(new Request("http://localhost/api/jobs/job_123/trash"), {
      params: Promise.resolve({ jobId: "job_123" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(dbMocks.jobUpdate).toHaveBeenCalledWith({
      where: { id: "job_123" },
      data: { deletedAt: null }
    });
  });

  it("permanently deletes a job with POST", async () => {
    dbMocks.jobDelete.mockResolvedValueOnce({ id: "job_123" });

    const response = await POST(new Request("http://localhost/api/jobs/job_123/trash", { method: "POST" }), {
      params: Promise.resolve({ jobId: "job_123" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(dbMocks.jobDelete).toHaveBeenCalledWith({
      where: { id: "job_123" }
    });
  });
});
