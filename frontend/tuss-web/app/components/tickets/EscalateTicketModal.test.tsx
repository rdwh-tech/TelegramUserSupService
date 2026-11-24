// app/components/tickets/EscalateTicketModal.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { EscalateTicketModal } from "./EscalateTicketModal";

describe("EscalateTicketModal Component [TUSS-FE-14]", () => {
  it("renders modal with ticket number and reason field", () => {
    renderWithProviders(
      <EscalateTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Передать обращение старшему оператору?")).toBeInTheDocument();
    expect(screen.getByText(/#1042/i)).toBeInTheDocument();
    expect(screen.getByTestId("escalate-reason-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-escalate-button")).toBeInTheDocument();
  });

  it("submits escalation reason when confirm button is clicked", async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    renderWithProviders(
      <EscalateTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    const input = screen.getByTestId("escalate-reason-input");
    fireEvent.change(input, { target: { value: "Сложная ошибка в биллинге" } });

    const confirmBtn = screen.getByTestId("confirm-escalate-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith("Сложная ошибка в биллинге");
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("displays error alert when onConfirm rejects", async () => {
    const handleConfirm = vi.fn().mockRejectedValue(new Error("Ошибка эскалации на сервере"));

    renderWithProviders(
      <EscalateTicketModal
        open={true}
        ticketNumber={1042}
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />
    );

    const confirmBtn = screen.getByTestId("confirm-escalate-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("Ошибка эскалации на сервере")).toBeInTheDocument();
    });
  });
});
