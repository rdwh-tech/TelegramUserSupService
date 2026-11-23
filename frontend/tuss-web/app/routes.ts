import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Публичные маршруты аутентификации (без общего рабочего лейаута)
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),

  // Защищенный 3-зонный лейаут приложения с ролевой маршрутизацией (RBAC)
  layout("layouts/AppLayout.tsx", [
    // Корневой диспетчер (перенаправляет по ролям)
    index("routes/home.tsx"),

    // Очереди тикетов (L1 / L2)
    route("queue/new", "routes/queue.new.tsx"),
    route("queue/escalated", "routes/queue.escalated.tsx"),

    // Рабочая область тикетов и архив
    route("tickets/active", "routes/tickets.active.tsx"),
    route("tickets/archive", "routes/tickets.archive.tsx"),
    route("tickets/:id", "routes/tickets.$id.tsx"),

    // Панель администратора
    route("admin/analytics", "routes/admin.analytics.tsx"),
    route("admin/staff", "routes/admin.staff.tsx"),
    route("admin/settings", "routes/admin.settings.tsx"),

    // Онбординг (без бокового меню)
    route("onboarding/invite-code", "routes/onboarding.invite-code.tsx"),
    route("onboarding/create-company", "routes/onboarding.create-company.tsx"),
  ]),
] satisfies RouteConfig;
