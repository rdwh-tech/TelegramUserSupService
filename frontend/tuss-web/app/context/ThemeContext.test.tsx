import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppThemeProvider, useAppTheme } from "./ThemeContext";
import { hexToHsl, hslToHex } from "~/theme/palettePresets";

function TestConsumer() {
  const { preset, setPreset, mode, setMode, density, setDensity, customSeed, setCustomSeed } = useAppTheme();

  return (
    <div>
      <span data-testid="current-preset">{preset}</span>
      <span data-testid="current-mode">{mode}</span>
      <span data-testid="current-density">{density}</span>
      <span data-testid="current-seed">{customSeed}</span>
      <button onClick={() => setPreset("pine")}>Set Pine</button>
      <button onClick={() => setMode("dark")}>Set Dark</button>
      <button onClick={() => setDensity("compact")}>Set Compact</button>
      <button onClick={() => setCustomSeed("#FF5722")}>Set Seed</button>
    </div>
  );
}

describe("ThemeContext & AppThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default theme values and persists changes in localStorage", () => {
    render(
      <AppThemeProvider>
        <TestConsumer />
      </AppThemeProvider>
    );

    expect(screen.getByTestId("current-preset").textContent).toBe("telegram");
    expect(screen.getByTestId("current-mode").textContent).toBe("light");
    expect(screen.getByTestId("current-density").textContent).toBe("comfortable");
    expect(screen.getByTestId("current-seed").textContent).toBe("#0077D6");

    // Change preset
    act(() => {
      screen.getByText("Set Pine").click();
    });
    expect(screen.getByTestId("current-preset").textContent).toBe("pine");
    expect(localStorage.getItem("tuss_theme_preset")).toBe("pine");

    // Change mode
    act(() => {
      screen.getByText("Set Dark").click();
    });
    expect(screen.getByTestId("current-mode").textContent).toBe("dark");
    expect(localStorage.getItem("tuss_theme_mode")).toBe("dark");

    // Change density
    act(() => {
      screen.getByText("Set Compact").click();
    });
    expect(screen.getByTestId("current-density").textContent).toBe("compact");
    expect(localStorage.getItem("tuss_theme_density")).toBe("compact");

    // Change seed
    act(() => {
      screen.getByText("Set Seed").click();
    });
    expect(screen.getByTestId("current-seed").textContent).toBe("#FF5722");
    expect(localStorage.getItem("tuss_theme_custom_seed")).toBe("#FF5722");
  });

  it("calculates HSL and HEX conversions correctly", () => {
    const hsl = hexToHsl("#005AC1");
    expect(hsl.h).toBeGreaterThan(200);
    expect(hsl.s).toBeGreaterThan(50);

    const hex = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(["#005ac1", "#005ac2"]).toContain(hex.toLowerCase());
  });
});
