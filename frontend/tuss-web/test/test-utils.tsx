import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "~/context/ThemeContext";
import { WebSocketProvider } from "~/context/WebSocketContext";

interface WrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] }
) {
  const { initialEntries = ["/"], ...renderOptions } = options || {};
  const queryClient = createTestQueryClient();

  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <WebSocketProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </WebSocketProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

export * from "@testing-library/react";
