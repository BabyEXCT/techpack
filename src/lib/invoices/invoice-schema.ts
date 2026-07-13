import { z } from "zod";

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer is required"),
  subtotal: z.number().nonnegative(),
  notes: z.string().optional().default(""),
  total: z.number().nonnegative(),
  paymentStatus: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional().default("DRAFT"),
  jobIds: z.array(z.string()).default([])
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
