// app/components/tickets/CloseTicketModal.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { CloseTicketModal } from "./CloseTicketModal";

describe("CloseTicketModal Component [TUSS-FE-15]", () => {
  it("renders modal with CSAT alert and resolution field", () => {
    renderWithProviders(
      <CloseTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Завершить обслуживание по тикету #1042\?/i)).toBeInTheDocument();
    expect(screen.getByText(/интерактивный опрос оценки качества обслуживания \(CSAT 1–5\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("resolution-notes-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-close-button")).toBeInTheDocument();
  });

  it("calls onConfirm with resolution notes and closes on success", async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    renderWithProviders(
      <CloseTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    const input = screen.getByTestId("resolution-notes-input");
    fireEvent.change(input, { target: { value: "Проблема решена сбросом авторизации" } });

    const confirmBtn = screen.getByTestId("confirm-close-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith("Проблема решена сбросом авторизации");
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("displays error alert when closing fails", async () => {
    const handleConfirm = vi.fn().mockRejectedValue(new Error("Сбой закрытия"));

    renderWithProviders(
      <CloseTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />
    );

    const confirmBtn = screen.getByTestId("confirm-close-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("Сбой закрытия")).toBeInTheDocument();
    });
  });
});
