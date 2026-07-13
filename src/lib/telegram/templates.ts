// src/lib/telegram/templates.ts
type JobLike = {
  projectName?: string | null;
  customerName?: string | null;
  category?: string | null;
  sizeLabel?: string | null;
  dateLabel?: string | null;
  cuttingType?: string | null;
  material?: string | null;
  collarType?: string | null;
  workflowStage?: string | null;
  priority?: string | null;
};

export function fillTemplate(body: string, job?: JobLike | null): string {
  const map: Record<string, string> = {
    customerName: job?.customerName ?? "",
    projectName: job?.projectName ?? "",
    category: job?.category ?? "",
    sizeLabel: job?.sizeLabel ?? "",
    dateLabel: job?.dateLabel ?? "",
    cuttingType: job?.cuttingType ?? "",
    material: job?.material ?? "",
    collarType: job?.collarType ?? "",
    workflowStage: job?.workflowStage ?? "",
    priority: job?.priority ?? ""
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => map[key] ?? "");
}
