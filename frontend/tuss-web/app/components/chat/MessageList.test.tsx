// app/components/chat/MessageList.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { MessageList } from "./MessageList";
import type { ExtendedMessage } from "./MessageItem";

const sampleMessages: ExtendedMessage[] = [
  {
    id: "m-1",
    ticketId: "t-1",
    senderType: "client",
    senderName: "Марина",
    text: "Первое сообщение вчера",
    isDelivered: true,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "m-2",
    ticketId: "t-1",
    senderType: "operator",
    senderName: "Алексей",
    text: "Второе сообщение сегодня",
    isDelivered: true,
    deliveryStatus: "delivered",
    createdAt: new Date().toISOString(),
  },
];

describe("MessageList Component [TUSS-FE-11]", () => {
  it("renders empty state when messages array is empty", () => {
    renderWithProviders(<MessageList messages={[]} />);

    expect(screen.getByTestId("message-list-empty")).toBeInTheDocument();
    expect(screen.getByText("Диалог начат")).toBeInTheDocument();
  });

  it("groups messages by date and renders date separator chips", () => {
    renderWithProviders(<MessageList messages={sampleMessages} />);

    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(screen.getByText("Вчера")).toBeInTheDocument();
    expect(screen.getByText("Сегодня")).toBeInTheDocument();
    expect(screen.getByText("Первое сообщение вчера")).toBeInTheDocument();
    expect(screen.getByText("Второе сообщение сегодня")).toBeInTheDocument();
  });
});
