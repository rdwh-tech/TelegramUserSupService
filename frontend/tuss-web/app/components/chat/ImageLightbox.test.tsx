// app/components/chat/ImageLightbox.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { ImageLightbox } from "./ImageLightbox";

describe("ImageLightbox Component [TUSS-FE-13]", () => {
  it("renders nothing when closed or without image", () => {
    const { container } = renderWithProviders(
      <ImageLightbox open={false} imageUrl={null} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders image preview and triggers onClose on close button click", () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <ImageLightbox
        open={true}
        imageUrl="https://example.com/screenshot.png"
        fileName="screenshot.png"
        onClose={handleClose}
      />
    );

    const img = screen.getByAltText("screenshot.png");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/screenshot.png");

    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
