import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { ThemeSwitcherMenu } from "./ThemeSwitcherMenu";

describe("ThemeSwitcherMenu Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders quick mode toggle and theme palette menu button", () => {
    renderWithProviders(<ThemeSwitcherMenu />);

    expect(screen.getByTestId("quick-mode-toggle-button")).toBeInTheDocument();
    expect(screen.getByTestId("theme-palette-menu-button")).toBeInTheDocument();
  });

  it("toggles mode between light and dark directly", () => {
    renderWithProviders(<ThemeSwitcherMenu />);

    const quickToggle = screen.getByTestId("quick-mode-toggle-button");
    fireEvent.click(quickToggle);
    expect(localStorage.getItem("tuss_theme_mode")).toBe("dark");

    fireEvent.click(quickToggle);
    expect(localStorage.getItem("tuss_theme_mode")).toBe("light");
  });

  it("opens popover and allows selecting different presets and density", () => {
    renderWithProviders(<ThemeSwitcherMenu />);

    // Open popover
    fireEvent.click(screen.getByTestId("theme-palette-menu-button"));

    expect(screen.getByText("Оформление интерфейса (Material 3)")).toBeInTheDocument();
    expect(screen.getByTestId("preset-select-pine")).toBeInTheDocument();
    expect(screen.getByTestId("preset-select-nordic")).toBeInTheDocument();
    expect(screen.getByTestId("preset-select-berry")).toBeInTheDocument();

    // Select Pine preset
    fireEvent.click(screen.getByTestId("preset-select-pine"));
    expect(localStorage.getItem("tuss_theme_preset")).toBe("pine");

    // Select Compact density
    fireEvent.click(screen.getByTestId("density-select-compact"));
    expect(localStorage.getItem("tuss_theme_density")).toBe("compact");
  });
});
