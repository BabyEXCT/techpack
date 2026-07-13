import { describe, expect, it } from "vitest";
import { buildMonthlyCalendar } from "../calendar";

describe("buildMonthlyCalendar", () => {
  it("maps approval and delivery dates into monthly events", () => {
    const calendar = buildMonthlyCalendar({
      month: 6,
      year: 2026,
      jobs: [
        {
          id: "job-1",
          projectName: "Team Alpha",
          customer: { name: "Alpha Sports" },
          workflowStage: "WAITING_APPROVAL",
          priority: "URGENT",
          approvalDate: new Date("2026-06-12T00:00:00.000Z"),
          deliveryDate: new Date("2026-06-14T00:00:00.000Z")
        }
      ]
    });

    expect(calendar.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "approval", label: "Team Alpha" }),
        expect.objectContaining({ kind: "delivery", label: "Team Alpha" })
      ])
    );
  });
});
