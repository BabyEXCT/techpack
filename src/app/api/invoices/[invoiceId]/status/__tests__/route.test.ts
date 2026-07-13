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

import { PUT } from "../route";

describe("PUT /api/invoices/[invoiceId]/status", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("updates status when transition is valid", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "i1",
      invoiceNumber: "TP-0001",
      paymentStatus: "DRAFT"
    });
    dbMocks.invoiceUpdate.mockResolvedValueOnce({ id: "i1", paymentStatus: "SENT" });

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SENT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.paymentStatus).toBe("SENT");
  });

  it("returns 400 for invalid transition", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "i1",
      paymentStatus: "PAID"
    });

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid status transition");
  });

  it("returns 404 for missing invoice", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SENT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invoice not found");
  });
});
