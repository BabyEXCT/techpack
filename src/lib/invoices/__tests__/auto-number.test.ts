/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

const txMocks = vi.hoisted(() => ({
  upsert: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn((cb: any) =>
      cb({
        invoiceCounter: { upsert: txMocks.upsert }
      })
    )
  }
}));

import { generateInvoiceNumber } from "../auto-number";

describe("generateInvoiceNumber", () => {
  it("returns TP-0001 on first call", async () => {
    txMocks.upsert.mockResolvedValueOnce({ id: "counter", prefix: "TP-", next: 2 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0001");
  });

  it("increments sequentially", async () => {
    txMocks.upsert.mockResolvedValueOnce({ id: "counter", prefix: "TP-", next: 5 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0004");
  });
});
