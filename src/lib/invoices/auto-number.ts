import { db } from "@/lib/db";

export async function generateInvoiceNumber(): Promise<string> {
  return db.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { id: "counter" },
      create: { id: "counter", prefix: "TP-", next: 1 },
      update: { next: { increment: 1 } }
    });
    const prev = counter.next - 1;
    return `${counter.prefix}${String(prev).padStart(4, "0")}`;
  });
}
