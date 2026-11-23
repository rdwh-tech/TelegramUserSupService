// app/components/tickets/SLAIndicator.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { SLAIndicator } from "./SLAIndicator";
import type { SLATimerInfo } from "~/types/sla";

describe("SLAIndicator Component", () => {
  it("renders placeholder when sla is undefined", () => {
    renderWithProviders(<SLAIndicator />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders 'ok' status with timer and appropriate attribute", () => {
    const okTimer: SLATimerInfo = {
      status: "ok",
      remainingSeconds: 720,
      formattedTime: "12 мин.",
      isPaused: false,
    };

    renderWithProviders(<SLAIndicator sla={okTimer} />);

    const indicator = screen.getByTestId("sla-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("data-status", "ok");
    expect(screen.getByText("12 мин.")).toBeInTheDocument();
  });

  it("renders 'warning' status with amber styling indicator", () => {
    const warningTimer: SLATimerInfo = {
      status: "warning",
      remainingSeconds: 180,
      formattedTime: "3 мин.",
      isPaused: false,
    };

    renderWithProviders(<SLAIndicator sla={warningTimer} />);

    const indicator = screen.getByTestId("sla-indicator");
    expect(indicator).toHaveAttribute("data-status", "warning");
    expect(screen.getByText("3 мин.")).toBeInTheDocument();
  });

  it("renders 'breached' status when SLA is violated", () => {
    const breachedTimer: SLATimerInfo = {
      status: "breached",
      remainingSeconds: -120,
      formattedTime: "-2 мин.",
      isPaused: false,
    };

    renderWithProviders(<SLAIndicator sla={breachedTimer} />);

    const indicator = screen.getByTestId("sla-indicator");
    expect(indicator).toHaveAttribute("data-status", "breached");
    expect(screen.getByText("-2 мин.")).toBeInTheDocument();
  });

  it("renders 'paused' status when isPaused is true", () => {
    const pausedTimer: SLATimerInfo = {
      status: "ok",
      remainingSeconds: 600,
      formattedTime: "10 мин.",
      isPaused: true,
    };

    renderWithProviders(<SLAIndicator sla={pausedTimer} />);

    const indicator = screen.getByTestId("sla-indicator");
    expect(indicator).toHaveAttribute("data-status", "paused");
  });

  it("prioritizes TTR when FRT is already completed (fact)", () => {
    const slaPair = {
      frt: {
        status: "ok" as const,
        remainingSeconds: 0,
        formattedTime: "4 мин 12 с (факт)",
        isPaused: false,
      },
      ttr: {
        status: "warning" as const,
        remainingSeconds: 1200,
        formattedTime: "20 мин.",
        isPaused: false,
      },
    };

    renderWithProviders(<SLAIndicator sla={slaPair} />);

    const indicator = screen.getByTestId("sla-indicator");
    expect(indicator).toHaveAttribute("data-status", "warning");
    expect(screen.getByText("20 мин.")).toBeInTheDocument();
  });
});
