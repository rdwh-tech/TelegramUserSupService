import React from "react";
import { describe, it, expect } from "vitest";
import { renderWithProviders } from "~/../test/test-utils";
import { AuthBackground } from "./AuthBackground";

describe("AuthBackground Component", () => {
  it("renders ambient background elements without crashing", () => {
    const { container } = renderWithProviders(
      <AuthBackground>
        <div>Контент внутри фона</div>
      </AuthBackground>
    );
    expect(container.firstChild).toBeInTheDocument();
    // Проверяем наличие дочерних градиентных сфер/слоев
    expect(container.querySelectorAll("div").length).toBeGreaterThan(1);
  });
});
