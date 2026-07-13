// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  saveJobFiles: vi.fn()
}));

vi.mock("@/lib/jobs/job-file-service", () => ({
  saveJobFiles: serviceMocks.saveJobFiles
}));

import { POST } from "../route";

describe("POST /api/jobs/[jobId]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.saveJobFiles.mockResolvedValue(undefined);
  });

  it("uploads mockup files for a job", async () => {
    const form = new FormData();
    form.set("kind", "MOCKUP");
    form.append("files", new File(["front"], "front.png", { type: "image/png" }));

    const request = new Request("http://localhost/api/jobs/job_123/files", {
      method: "POST",
      body: form
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(serviceMocks.saveJobFiles).toHaveBeenCalledWith(
      "job_123",
      "MOCKUP",
      [expect.any(File)]
    );
  });

  it("returns 400 when no files are provided", async () => {
    const form = new FormData();
    form.set("kind", "MOCKUP");

    const request = new Request("http://localhost/api/jobs/job_123/files", {
      method: "POST",
      body: form
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: "job_123" }) });

    expect(response.status).toBe(400);
    expect(serviceMocks.saveJobFiles).not.toHaveBeenCalled();
  });
});
