import { beforeEach, describe, expect, it, vi } from "vitest";

const generateMocks = vi.hoisted(() => ({
  POST: vi.fn()
}));

vi.mock("../../generate/route", () => ({
  POST: generateMocks.POST
}));

import { GET } from "../route";

describe("GET /api/jobs/[jobId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the combined PDF for inline preview", async () => {
    generateMocks.POST.mockResolvedValueOnce(
      Response.json({
        files: [
          {
            key: "combined",
            name: "supplier-techpack-order-sheet.pdf",
            mimeType: "application/pdf",
            size: 5,
            base64: Buffer.from("%PDF-").toString("base64")
          }
        ]
      })
    );

    const response = await GET(new Request("http://localhost/api/jobs/job_123/preview"), {
      params: Promise.resolve({ jobId: "job_123" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(Buffer.from(await response.arrayBuffer()).toString("utf8")).toBe("%PDF-");
  });

  it("returns 404 when generation does not include the combined PDF", async () => {
    generateMocks.POST.mockResolvedValueOnce(Response.json({ files: [] }));

    const response = await GET(new Request("http://localhost/api/jobs/job_123/preview"), {
      params: Promise.resolve({ jobId: "job_123" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Combined PDF not found" });
  });
});
