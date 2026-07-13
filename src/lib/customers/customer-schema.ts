import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  companyName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  preferredPaymentMethod: z.string().optional().default(""),
  deliveryNote: z.string().optional().default(""),
  notes: z.string().optional().default("")
});

export type CustomerInput = z.infer<typeof customerSchema>;
