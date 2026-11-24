// app/components/chat/MessageItem.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import { MessageItem, type ExtendedMessage } from "./MessageItem";

const clientMessage: ExtendedMessage = {
  id: "m-client-1",
  ticketId: "t-1",
  senderType: "client",
  senderName: "Марина",
  text: "Здравствуйте! У меня не проходит платеж.",
  isDelivered: true,
  createdAt: "2026-02-10T12:00:00Z",
};

const operatorMessage: ExtendedMessage = {
  id: "m-op-1",
  ticketId: "t-1",
  senderType: "operator",
  senderName: "Алексей (Поддержка)",
  text: "Здравствуйте! Уточните, какую ошибку выдает банк?",
  isDelivered: true,
  deliveryStatus: "delivered",
  createdAt: "2026-02-10T12:02:00Z",
};

const failedMessage: ExtendedMessage = {
  id: "m-failed-1",
  ticketId: "t-1",
  senderType: "operator",
  senderName: "Алексей",
  text: "Тестовое сообщение со сбоем",
  isDelivered: false,
  deliveryStatus: "failed",
  createdAt: "2026-02-10T12:05:00Z",
};

describe("MessageItem Component [TUSS-FE-11]", () => {
  it("renders incoming client message aligned left", () => {
    renderWithProviders(<MessageItem message={clientMessage} />);

    const item = screen.getByTestId("message-item-m-client-1");
    expect(item).toHaveAttribute("data-sender", "client");
    expect(screen.getByText("Здравствуйте! У меня не проходит платеж.")).toBeInTheDocument();
    expect(screen.getByText("Марина")).toBeInTheDocument();
  });

  it("renders outgoing operator message with delivered status icon", () => {
    renderWithProviders(<MessageItem message={operatorMessage} />);

    const item = screen.getByTestId("message-item-m-op-1");
    expect(item).toHaveAttribute("data-sender", "operator");
    expect(item).toHaveAttribute("data-status", "delivered");
    expect(screen.getByText("Алексей (Поддержка)")).toBeInTheDocument();
  });

  it("renders failed delivery state with retry button and calls onRetry", async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<MessageItem message={failedMessage} onRetry={handleRetry} />);

    expect(screen.getByText("Не доставлено")).toBeInTheDocument();
    const retryBtn = screen.getByTitle("Повторить отправку");
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledWith("m-failed-1");
  });

  it("renders system message centered", () => {
    const systemMsg: ExtendedMessage = {
      id: "m-sys-1",
      ticketId: "t-1",
      senderType: "system",
      text: "Тикет эскалирован на вторую линию поддержки",
      isDelivered: true,
      createdAt: "2026-02-10T12:10:00Z",
    };

    renderWithProviders(<MessageItem message={systemMsg} />);

    expect(screen.getByTestId("system-message-m-sys-1")).toBeInTheDocument();
    expect(screen.getByText("Тикет эскалирован на вторую линию поддержки")).toBeInTheDocument();
  });

  it("renders photo and document attachments", () => {
    const msgWithAttachments: ExtendedMessage = {
      ...clientMessage,
      id: "m-att-1",
      attachments: [
        {
          id: "att-1",
          messageId: "m-att-1",
          fileType: "photo",
          fileUrl: "/mock-photo.jpg",
          fileName: "screenshot.jpg",
          fileSizeBytes: 1024 * 500,
        },
        {
          id: "att-2",
          messageId: "m-att-1",
          fileType: "document",
          fileUrl: "/mock-doc.pdf",
          fileName: "contract.pdf",
          fileSizeBytes: 1024 * 1024 * 2.5,
        },
      ],
    };

    renderWithProviders(<MessageItem message={msgWithAttachments} />);

    const image = screen.getByAltText("screenshot.jpg");
    expect(image).toBeInTheDocument();
    expect(screen.getByText("contract.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.5 МБ")).toBeInTheDocument();
  });
});
