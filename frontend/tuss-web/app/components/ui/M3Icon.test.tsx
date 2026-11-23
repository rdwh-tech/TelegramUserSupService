import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { M3Icon } from "./M3Icon";

describe("M3Icon Component", () => {
  it("renders the icon font ligature text correctly", () => {
    renderWithProviders(<M3Icon name="support_agent" />);
    const icon = screen.getByText("support_agent");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("material-symbols-rounded");
  });

  it("applies custom size via fontSize style", () => {
    renderWithProviders(<M3Icon name="inbox" size={32} />);
    const icon = screen.getByText("inbox");
    expect(icon).toHaveStyle({ fontSize: "32px" });
  });

  it("sets fill variation font setting when filled is true", () => {
    renderWithProviders(<M3Icon name="star" filled={true} />);
    const icon = screen.getByText("star");
    expect(icon.style.fontVariationSettings).toMatch(/FILL["']?\s*1/);
  });

  it("sets unfilled font setting when filled is false", () => {
    renderWithProviders(<M3Icon name="star" filled={false} />);
    const icon = screen.getByText("star");
    expect(icon.style.fontVariationSettings).toMatch(/FILL["']?\s*0/);
  });
});
