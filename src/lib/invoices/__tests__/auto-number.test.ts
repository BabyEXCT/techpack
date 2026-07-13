/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoiceCounter: {
      findUnique: dbMocks.findUnique,
      create: dbMocks.create,
      update: dbMocks.update
    }
  }
}));

import { generateInvoiceNumber } from "../auto-number";

describe("generateInvoiceNumber", () => {
  it("returns TP-0001 on first call (creates counter at next=1)", async () => {
    dbMocks.findUnique.mockResolvedValueOnce(null);
    dbMocks.create.mockResolvedValueOnce({ id: "default", prefix: "TP-", next: 1 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0001");
    expect(dbMocks.update).toHaveBeenCalledWith({
      where: { id: "default" },
      data: { next: 2 }
    });
  });

  it("increments sequentially after existing counter", async () => {
    dbMocks.findUnique.mockResolvedValueOnce({ id: "default", prefix: "TP-", next: 4 });
    dbMocks.create.mockResolvedValueOnce({ id: "default", prefix: "TP-", next: 4 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0004");
    expect(dbMocks.update).toHaveBeenCalledWith({
      where: { id: "default" },
      data: { next: 5 }
    });
  });
});
