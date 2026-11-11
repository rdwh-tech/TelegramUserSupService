// app/mocks/handlers.ts
import { authHandlers } from "./handlers/auth";
import { ticketsHandlers } from "./handlers/tickets";
import { settingsHandlers } from "./handlers/settings";
import { analyticsHandlers } from "./handlers/analytics";

export const handlers = [
  ...authHandlers,
  ...ticketsHandlers,
  ...settingsHandlers,
  ...analyticsHandlers,
];
