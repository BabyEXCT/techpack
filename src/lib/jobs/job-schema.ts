import { z } from "zod";

export const createJobSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  customerName: z.string().optional().default(""),
  customerId: z.string().optional().nullable(),
  category: z.string().optional().default("Sublimation"),
  cuttingType: z.string().optional().default(""),
  material: z.string().optional().default(""),
  collarType: z.string().optional().default(""),
  sourceMessage: z.string().optional().default(""),
  workflowStage: z.enum(["NEW", "DESIGN", "WAITING_APPROVAL", "PRODUCTION", "DONE"]).optional().default("NEW"),
  priority: z.enum(["NORMAL", "URGENT", "RUSH"]).optional().default("NORMAL")
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
