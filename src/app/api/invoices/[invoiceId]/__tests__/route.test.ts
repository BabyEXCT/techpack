// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findUnique: dbMocks.invoiceFindUnique,
      update: dbMocks.invoiceUpdate
    }
  }
}));

import { GET, PATCH } from "../route";

describe("GET /api/invoices/[invoiceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an invoice with its customer and jobs", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "i1",
      invoiceNumber: "INV-001",
      customer: { id: "c1", name: "Aida Sports" },
      jobs: [{ id: "j1", projectName: "Match Kit" }]
    });

    const response = await GET(new Request("http://localhost/api/invoices/i1"), {
      params: Promise.resolve({ invoiceId: "i1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        id: "i1",
        invoiceNumber: "INV-001",
        customer: expect.objectContaining({ id: "c1" }),
        jobs: [expect.objectContaining({ id: "j1" })]
      })
    );
    expect(dbMocks.invoiceFindUnique).toHaveBeenCalledWith({
      where: { id: "i1" },
      include: { customer: true, jobs: true }
    });
  });

  it("returns 404 when the invoice is missing", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/invoices/missing"), {
      params: Promise.resolve({ invoiceId: "missing" })
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invoice not found");
  });
});

describe("PATCH /api/invoices/[invoiceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an invoice and resets linked jobs to the submitted set", async () => {
    dbMocks.invoiceUpdate.mockResolvedValueOnce({
      id: "i1",
      invoiceNumber: "INV-001"
    });

    const response = await PATCH(
      new Request("http://localhost/api/invoices/i1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "INV-001",
          customerId: "c1",
          subtotal: 100,
          notes: "Balance due on delivery",
          total: 120,
          paymentStatus: "SENT",
          jobIds: ["j1", "j2"]
        })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ id: "i1", invoiceNumber: "INV-001" }));
    expect(dbMocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: {
        invoiceNumber: "INV-001",
        customerId: "c1",
        subtotal: 100,
        notes: "Balance due on delivery",
        total: 120,
        paymentStatus: "SENT",
        jobs: {
          set: [{ id: "j1" }, { id: "j2" }]
        }
      },
      include: { customer: true, jobs: true }
    });
  });

  it("returns 400 for invalid invoice changes", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/invoices/i1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "",
          customerId: "",
          subtotal: -1,
          total: -2
        })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invoice number is required");
    expect(dbMocks.invoiceUpdate).not.toHaveBeenCalled();
  });
});
