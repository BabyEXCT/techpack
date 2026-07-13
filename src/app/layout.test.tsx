import { vi } from "vitest";

// Mock geist/font to prevent ESM import errors in test environment
vi.mock("geist/font", () => ({
  GeistSans: { variable: "--font-geist-sans" },
  GeistMono: { variable: "--font-geist-mono" }
}));

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders the HTML shell with font variables", () => {
    render(<RootLayout><div data-testid="child" /></RootLayout>);

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(document.documentElement.className).toContain("geist");
    expect(document.body.className).toContain("min-h-dvh");
  });
});
