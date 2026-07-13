type DashboardJob = {
  id: string;
  projectName: string;
  priority: "NORMAL" | "URGENT" | "RUSH";
  workflowStage: "NEW" | "DESIGN" | "WAITING_APPROVAL" | "PRODUCTION" | "DONE";
  approvalDate: Date | null;
  deliveryDate: Date | null;
  customer?: { name: string | null } | null;
};

type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  paymentStatus: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  total: number;
  customer?: { name: string | null } | null;
};

export type DashboardReminder = {
  id: string;
  type: "approval" | "delivery" | "invoice";
  title: string;
  subtitle: string;
  actionHref: string;
  date: Date;
};

export function buildDashboardReminders(input: {
  now: Date;
  jobs: DashboardJob[];
  invoices: DashboardInvoice[];
}): DashboardReminder[] {
  const reminders: DashboardReminder[] = [];

  for (const job of input.jobs) {
    if (job.approvalDate) {
      reminders.push({
        id: `approval-${job.id}`,
        type: "approval",
        title: `Approval due for ${job.projectName}`,
        subtitle: job.customer?.name ?? "Unknown customer",
        actionHref: `/jobs/${job.id}/review`,
        date: job.approvalDate
      });
    }

    if (job.deliveryDate) {
      reminders.push({
        id: `delivery-${job.id}`,
        type: "delivery",
        title: `Delivery due for ${job.projectName}`,
        subtitle: job.customer?.name ?? "Unknown customer",
        actionHref: `/jobs/${job.id}/review`,
        date: job.deliveryDate
      });
    }
  }

  for (const invoice of input.invoices) {
    if (invoice.paymentStatus === "PAID") {
      continue;
    }

    reminders.push({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      title:
        invoice.paymentStatus === "OVERDUE"
          ? `Invoice ${invoice.invoiceNumber} overdue`
          : `Invoice ${invoice.invoiceNumber} unpaid`,
      subtitle: invoice.customer?.name ?? "Unknown customer",
      actionHref: `/invoices/${invoice.id}`,
      date: input.now
    });
  }

  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}
