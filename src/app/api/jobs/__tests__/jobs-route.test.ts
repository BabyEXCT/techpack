import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  userUpsert: vi.fn(),
  jobCreate: vi.fn(),
  jobFindMany: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      upsert: dbMocks.userUpsert
    },
    job: {
      create: dbMocks.jobCreate,
      findMany: dbMocks.jobFindMany
    }
  }
}));

import { GET, POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/jobs", () => {
  it("lists only active jobs by default", async () => {
    dbMocks.jobFindMany.mockResolvedValueOnce([
      {
        id: "job_active",
        projectName: "Active Job",
        workflowStage: "DESIGN",
        priority: "URGENT",
        customerId: "customer_1",
        customer: {
          id: "customer_1",
          name: "Aida Sports"
        },
        deletedAt: null,
        createdAt: new Date("2026-06-17T10:00:00.000Z")
      }
    ]);

    const request = new Request("http://localhost/api/jobs");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "job_active",
        projectName: "Active Job",
        workflowStage: "DESIGN",
        priority: "URGENT",
        customer: expect.objectContaining({
          id: "customer_1",
          name: "Aida Sports"
        }),
        deletedAt: null
      })
    ]);
    expect(dbMocks.jobFindMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });
  });

  it("lists deleted jobs when scope=bin", async () => {
    dbMocks.jobFindMany.mockResolvedValueOnce([
      {
        id: "job_deleted",
        projectName: "Deleted Job",
        deletedAt: new Date("2026-06-17T12:00:00.000Z"),
        createdAt: new Date("2026-06-17T10:00:00.000Z")
      }
    ]);

    const request = new Request("http://localhost/api/jobs?scope=bin");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "job_deleted",
        projectName: "Deleted Job"
      })
    ]);
    expect(dbMocks.jobFindMany).toHaveBeenCalledWith({
      where: { deletedAt: { not: null } },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });
  });
});

describe("POST /api/jobs", () => {
  it("creates a draft job from intake payload", async () => {
    dbMocks.userUpsert.mockResolvedValueOnce({
      id: "demo-user",
      email: "demo@local"
    });
    dbMocks.jobCreate.mockResolvedValueOnce({
      id: "job_123",
      projectName: "Kraxtom FC"
    });

    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        projectName: "Kraxtom FC",
        sourceMessage: "Azlan 14 M",
        customerId: "customer_1",
        workflowStage: "DESIGN",
        priority: "URGENT"
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.projectName).toBe("Kraxtom FC");
    expect(dbMocks.userUpsert).toHaveBeenCalled();
    expect(dbMocks.jobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectName: "Kraxtom FC",
          sourceMessage: "Azlan 14 M",
          customerId: "customer_1",
          workflowStage: "DESIGN",
          priority: "URGENT",
          ownerId: "demo-user"
        })
      })
    );
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      body: JSON.stringify({ projectName: "" })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
