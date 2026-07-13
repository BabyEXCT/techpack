import { db } from "@/lib/db";

export async function generateInvoiceNumber(): Promise<string> {
  let counter = await db.invoiceCounter.findUnique({ where: { id: "default" } });

  if (!counter) {
    counter = await db.invoiceCounter.create({
      data: { id: "default", prefix: "TP-", next: 1 },
    });
  }

  const num = counter.next as number;
  await db.invoiceCounter.update({
    where: { id: "default" },
    data: { next: num + 1 },
  });

  const prefix = (counter.prefix as string) ?? "TP-";
  return `${prefix}${String(num).padStart(4, "0")}`;
}
