// app/components/chat/MessageComposer.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import { MessageComposer } from "./MessageComposer";

describe("MessageComposer Component [TUSS-FE-12, TUSS-FE-13]", () => {
  it("renders textarea and disabled send button when empty", () => {
    renderWithProviders(<MessageComposer onSendMessage={vi.fn()} />);

    expect(screen.getByTestId("message-input-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("send-message-button")).toBeDisabled();
    expect(screen.getByTestId("attach-file-button")).toBeEnabled();
  });

  it("enables send button and calls onSendMessage on Enter key press", async () => {
    const handleSend = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<MessageComposer onSendMessage={handleSend} />);

    const input = screen.getByTestId("message-input-textarea");
    fireEvent.change(input, { target: { value: "Здравствуйте, чем могу помочь?" } });

    const sendBtn = screen.getByTestId("send-message-button");
    expect(sendBtn).toBeEnabled();

    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(handleSend).toHaveBeenCalledWith("Здравствуйте, чем могу помочь?", []);
      expect(input).toHaveValue("");
    });
  });

  it("does not send message on Shift+Enter (allows newline)", () => {
    const handleSend = vi.fn();
    renderWithProviders(<MessageComposer onSendMessage={handleSend} />);

    const input = screen.getByTestId("message-input-textarea");
    fireEvent.change(input, { target: { value: "Первая строка" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("Первая строка");
  });

  it("retains input text if onSendMessage rejects with error (FR-WEB-11 network failure recovery)", async () => {
    const handleSend = vi.fn().mockRejectedValue(new Error("Network error"));
    renderWithProviders(<MessageComposer onSendMessage={handleSend} />);

    const input = screen.getByTestId("message-input-textarea");
    fireEvent.change(input, { target: { value: "Важное сообщение" } });

    const sendBtn = screen.getByTestId("send-message-button");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(handleSend).toHaveBeenCalled();
    });

    // Текст не должен очищаться при ошибке отправки
    expect(input).toHaveValue("Важное сообщение");
  });

  it("validates file size limit of 20MB and shows warning alert", () => {
    renderWithProviders(<MessageComposer onSendMessage={vi.fn()} />);

    const fileInput = screen.getByTestId("file-upload-input");

    // Создаем файл размером 25 МБ
    const hugeFile = new File(["x".repeat(1024)], "huge_video.zip", {
      type: "application/zip",
    });
    Object.defineProperty(hugeFile, "size", { value: 25 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [hugeFile] } });

    expect(
      screen.getByText(/слишком большой. Максимальный размер вложения — 20 МБ/i)
    ).toBeInTheDocument();
  });

  it("attaches valid file and shows chip with remove option", () => {
    renderWithProviders(<MessageComposer onSendMessage={vi.fn()} />);

    const fileInput = screen.getByTestId("file-upload-input");
    const validFile = new File(["hello"], "document.pdf", { type: "application/pdf" });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 * 2 }); // 2 MB

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.getByText(/document\.pdf/i)).toBeInTheDocument();
    expect(screen.getByTestId("send-message-button")).toBeEnabled();
  });
});
