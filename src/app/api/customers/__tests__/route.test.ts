// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  customerCreate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findMany: dbMocks.customerFindMany,
      create: dbMocks.customerCreate
    }
  }
}));

import { GET, POST } from "../route";

describe("GET /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns customers ordered by latest update", async () => {
    dbMocks.customerFindMany.mockResolvedValueOnce([
      {
        id: "c1",
        name: "Aida",
        phone: "012",
        jobs: [],
        invoices: [],
        updatedAt: new Date("2026-06-18T10:00:00.000Z")
      }
    ]);

    const response = await GET(new Request("http://localhost/api/customers"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "c1",
        name: "Aida",
        phone: "012"
      })
    ]);
    expect(dbMocks.customerFindMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
      include: { jobs: true, invoices: true }
    });
  });
});

describe("POST /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a customer record", async () => {
    dbMocks.customerCreate.mockResolvedValueOnce({
      id: "c1",
      name: "Aida",
      phone: "012"
    });

    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Aida", phone: "012" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        id: "c1",
        name: "Aida",
        phone: "012"
      })
    );
    expect(dbMocks.customerCreate).toHaveBeenCalledWith({
      data: {
        name: "Aida",
        companyName: "",
        phone: "012",
        email: "",
        address: "",
        preferredPaymentMethod: "",
        deliveryNote: "",
        notes: ""
      }
    });
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Customer name is required");
    expect(dbMocks.customerCreate).not.toHaveBeenCalled();
  });
});
