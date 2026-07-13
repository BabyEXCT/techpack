import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BinPage from "@/app/jobs/bin/page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/jobs/bin-list", () => ({
  BinList: () => <div>Bin list content</div>
}));

describe("BinPage", () => {
  it("renders the bin heading, back link, and bin list", () => {
    render(<BinPage />);

    expect(screen.getByRole("heading", { name: "Bin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to jobs" })).toHaveAttribute("href", "/jobs");
    expect(screen.getByText("Bin list content")).toBeInTheDocument();
  });
});
