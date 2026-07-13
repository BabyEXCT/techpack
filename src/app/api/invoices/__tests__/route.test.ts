// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindMany: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceCounterUpsert: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: dbMocks.invoiceFindMany,
      create: dbMocks.invoiceCreate
    },
    $transaction: vi.fn((cb) => cb({ invoiceCounter: { upsert: dbMocks.invoiceCounterUpsert } }))
  }
}));

import { GET, POST } from "../route";

describe("GET /api/invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoice records", async () => {
    dbMocks.invoiceFindMany.mockResolvedValueOnce([
      {
        id: "i1",
        invoiceNumber: "INV-001",
        total: 120,
        customer: { id: "c1", name: "Aida Sports" },
        jobs: [{ id: "j1", projectName: "Match Kit" }]
      }
    ]);

    const response = await GET(new Request("http://localhost/api/invoices"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "i1",
        invoiceNumber: "INV-001",
        total: 120
      })
    ]);
    expect(dbMocks.invoiceFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      include: { customer: true, jobs: true }
    });
  });
});

describe("POST /api/invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an invoice linked to a customer", async () => {
    dbMocks.invoiceCreate.mockResolvedValueOnce({
      id: "i1",
      invoiceNumber: "INV-001",
      total: 120
    });

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "INV-001",
          customerId: "c1",
          subtotal: 100,
          total: 120,
          jobIds: ["j1"],
          paymentStatus: "DRAFT"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        id: "i1",
        invoiceNumber: "INV-001",
        total: 120
      })
    );
    expect(dbMocks.invoiceCreate).toHaveBeenCalledWith({
      data: {
        invoiceNumber: "INV-001",
        customerId: "c1",
        subtotal: 100,
        notes: "",
        total: 120,
        paymentStatus: "DRAFT",
        jobs: {
          connect: [{ id: "j1" }]
        }
      },
      include: { customer: true, jobs: true }
    });
  });

  it("returns 400 for invalid invoice payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "",
          customerId: "",
          subtotal: -1,
          total: -2
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invoice number is required");
    expect(dbMocks.invoiceCreate).not.toHaveBeenCalled();
  });
});
