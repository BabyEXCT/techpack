import { describe, expect, it } from "vitest";
import { buildDashboardReminders } from "../reminders";

describe("buildDashboardReminders", () => {
  it("creates approval and delivery reminders from upcoming jobs", () => {
    const reminders = buildDashboardReminders({
      now: new Date("2026-06-19T00:00:00.000Z"),
      jobs: [
        {
          id: "job-1",
          projectName: "Team Alpha",
          priority: "URGENT",
          workflowStage: "DESIGN",
          approvalDate: new Date("2026-06-20T00:00:00.000Z"),
          deliveryDate: new Date("2026-06-22T00:00:00.000Z"),
          customer: { name: "Alpha Sports" }
        }
      ],
      invoices: []
    });

    expect(reminders.map((item) => item.type)).toEqual(["approval", "delivery"]);
    expect(reminders[0]?.title).toContain("Approval due");
  });

  it("creates unpaid invoice reminders", () => {
    const reminders = buildDashboardReminders({
      now: new Date("2026-06-19T00:00:00.000Z"),
      jobs: [],
      invoices: [
        {
          id: "invoice-1",
          invoiceNumber: "INV-001",
          paymentStatus: "OVERDUE",
          customer: { name: "Aida Sports" },
          total: 230
        }
      ]
    });

    expect(reminders[0]).toMatchObject({
      type: "invoice",
      title: "Invoice INV-001 overdue"
    });
  });
});
