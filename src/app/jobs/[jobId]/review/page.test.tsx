import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/jobs/review-job-client", () => ({
  ReviewJobClient: ({ jobId }: { jobId: string }) => <div>Review client {jobId}</div>
}));

import ReviewJobPage from "./page";

describe("ReviewJobPage", () => {
  it("renders a back-to-edit link for the same job", async () => {
    render(await ReviewJobPage({ params: Promise.resolve({ jobId: "job-123" }) }));

    expect(screen.getByRole("link", { name: "Back to edit job" })).toHaveAttribute(
      "href",
      "/jobs/new?jobId=job-123"
    );
  });
});
