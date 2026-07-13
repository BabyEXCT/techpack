type CalendarJob = {
  id: string;
  projectName: string;
  customer?: { name: string | null } | null;
  workflowStage: "NEW" | "DESIGN" | "WAITING_APPROVAL" | "PRODUCTION" | "DONE";
  priority: "NORMAL" | "URGENT" | "RUSH";
  approvalDate: Date | null;
  deliveryDate: Date | null;
};

export type MonthlyCalendarEvent = {
  id: string;
  jobId: string;
  kind: "approval" | "delivery";
  label: string;
  customerName: string;
  date: Date;
};

export function buildMonthlyCalendar(input: {
  month: number;
  year: number;
  jobs: CalendarJob[];
}): { month: number; year: number; events: MonthlyCalendarEvent[] } {
  const events = input.jobs.flatMap<MonthlyCalendarEvent>((job) => {
    const list: MonthlyCalendarEvent[] = [];

    if (
      job.approvalDate &&
      job.approvalDate.getUTCFullYear() === input.year &&
      job.approvalDate.getUTCMonth() + 1 === input.month
    ) {
      list.push({
        id: `approval-${job.id}`,
        jobId: job.id,
        kind: "approval",
        label: job.projectName,
        customerName: job.customer?.name ?? "Unknown customer",
        date: job.approvalDate
      });
    }

    if (
      job.deliveryDate &&
      job.deliveryDate.getUTCFullYear() === input.year &&
      job.deliveryDate.getUTCMonth() + 1 === input.month
    ) {
      list.push({
        id: `delivery-${job.id}`,
        jobId: job.id,
        kind: "delivery",
        label: job.projectName,
        customerName: job.customer?.name ?? "Unknown customer",
        date: job.deliveryDate
      });
    }

    return list;
  });

  return {
    month: input.month,
    year: input.year,
    events
  };
}
