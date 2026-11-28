import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { M3Button } from "./M3Button";

describe("M3Button Component", () => {
  it("renders children text correctly", () => {
    renderWithProviders(<M3Button>Нажми меня</M3Button>);
    expect(screen.getByRole("button", { name: "Нажми меня" })).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    renderWithProviders(<M3Button onClick={handleClick}>Отправить</M3Button>);

    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    renderWithProviders(<M3Button disabled>Заблокировано</M3Button>);
    const button = screen.getByRole("button", { name: "Заблокировано" });
    expect(button).toBeDisabled();
  });

  it("shows loading spinner and is disabled when isLoading is true", () => {
    renderWithProviders(<M3Button isLoading>Загрузка данных</M3Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector(".MuiCircularProgress-root")).toBeInTheDocument();
  });

  it("prevents double-click and ignores clicks when loading or disabled (TUSS-FE-33)", () => {
    const handleClick = vi.fn();
    const { rerender } = renderWithProviders(
      <M3Button onClick={handleClick}>Сохранить</M3Button>
    );

    const button = screen.getByRole("button", { name: "Сохранить" });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // При переходе в isLoading повторный клик блокируется
    rerender(<M3Button onClick={handleClick} isLoading>Сохранить</M3Button>);
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
