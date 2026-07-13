import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  updateJobDraft: vi.fn()
}));

vi.mock("@/lib/jobs/job-draft-service", () => ({
  updateJobDraft: serviceMocks.updateJobDraft
}));

import { PATCH } from "../route";

describe("PATCH /api/jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.updateJobDraft.mockResolvedValue(undefined);
  });

  it("updates the job review draft", async () => {
    const request = new Request("http://localhost/api/jobs/job_123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Kraxtom FC",
        placementNote: "left chest logo, sponsor center",
        category: "Sublimation",
        items: [
          {
            name: "Muslimah",
            cuttingType: "Muslimah",
            material: "Eyelet",
            roster: [{ rowNumber: 1, name: "ALYAA", number: "11", size: "S", qty: 1, remarks: "" }]
          }
        ],
        roster: [{ rowNumber: 1, name: "Azlan", number: "14", size: "M", qty: 2, remarks: "Captain" }]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ jobId: "job_123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(serviceMocks.updateJobDraft).toHaveBeenCalledWith(
      "job_123",
      expect.objectContaining({
        projectName: "Kraxtom FC",
        placementNote: "left chest logo, sponsor center",
        category: "Sublimation",
        items: [
          expect.objectContaining({
            name: "Muslimah",
            cuttingType: "Muslimah",
            material: "Eyelet",
            roster: [expect.objectContaining({ rowNumber: 1, name: "ALYAA" })]
          })
        ],
        roster: [expect.objectContaining({ rowNumber: 1, qty: 2 })]
      })
    );
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost/api/jobs/job_123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "",
        roster: [{ rowNumber: 0, name: "Azlan" }]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ jobId: "job_123" }) });

    expect(response.status).toBe(400);
    expect(serviceMocks.updateJobDraft).not.toHaveBeenCalled();
  });
});
