// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindUnique: vi.fn(),
  customerUpdate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findUnique: dbMocks.customerFindUnique,
      update: dbMocks.customerUpdate
    }
  }
}));

import { GET, PATCH } from "../route";

describe("GET /api/customers/[customerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a customer profile with linked jobs and invoices", async () => {
    dbMocks.customerFindUnique.mockResolvedValueOnce({
      id: "c1",
      name: "Aida Sports",
      jobs: [{ id: "j1", projectName: "Match Kit" }],
      invoices: [{ id: "i1", invoiceNumber: "INV-001" }]
    });

    const response = await GET(new Request("http://localhost/api/customers/c1"), {
      params: Promise.resolve({ customerId: "c1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        id: "c1",
        name: "Aida Sports",
        jobs: [expect.objectContaining({ id: "j1" })],
        invoices: [expect.objectContaining({ id: "i1" })]
      })
    );
    expect(dbMocks.customerFindUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      include: { jobs: true, invoices: true }
    });
  });

  it("returns 404 when the customer is missing", async () => {
    dbMocks.customerFindUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/customers/missing"), {
      params: Promise.resolve({ customerId: "missing" })
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Customer not found");
  });
});

describe("PATCH /api/customers/[customerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a customer profile", async () => {
    dbMocks.customerUpdate.mockResolvedValueOnce({
      id: "c1",
      name: "Aida Sports"
    });

    const response = await PATCH(
      new Request("http://localhost/api/customers/c1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Aida Sports",
          email: "owner@aida.test",
          preferredPaymentMethod: "Cash"
        })
      }),
      { params: Promise.resolve({ customerId: "c1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ id: "c1", name: "Aida Sports" }));
    expect(dbMocks.customerUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        name: "Aida Sports",
        companyName: "",
        phone: "",
        email: "owner@aida.test",
        address: "",
        preferredPaymentMethod: "Cash",
        deliveryNote: "",
        notes: ""
      }
    });
  });

  it("returns 400 for invalid customer changes", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/customers/c1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" })
      }),
      { params: Promise.resolve({ customerId: "c1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Customer name is required");
    expect(dbMocks.customerUpdate).not.toHaveBeenCalled();
  });
});
