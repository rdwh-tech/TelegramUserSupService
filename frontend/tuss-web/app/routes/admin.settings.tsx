// app/routes/admin.settings.tsx
import React, { useState } from "react";
import { Box, Typography, Card, CardContent, Stack, Tabs, Tab } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";

export function meta() {
  return [
    { title: "Настройки компании — TUSS Admin" },
    { name: "description", content: "Конфигурация компании, Telegram-бота, SLA и маршрутизации" },
  ];
}

export default function AdminSettingsRoute() {
  const [tabIndex, setTabIndex] = useState(0);

  const tabs = [
    { label: "Профиль компании", icon: "business" },
    { label: "Telegram-бот", icon: "smart_toy" },
    { label: "SLA и график", icon: "schedule" },
    { label: "FAQ и автоответы", icon: "question_answer" },
    { label: "Маршрутизация", icon: "alt_route" },
  ];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Настройки компании
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Управление профилем компании, интеграцией с Telegram Bot API и параметрами обслуживания
            </Typography>
          </div>
        </Stack>

        <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
          <Box sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2, bgcolor: "background.paper" }}>
            <Tabs
              value={tabIndex}
              onChange={(_, val) => setTabIndex(val)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabs.map((tab, idx) => (
                <Tab
                  key={tab.label}
                  icon={<M3Icon name={tab.icon} size={20} />}
                  iconPosition="start"
                  label={tab.label}
                  id={`settings-tab-${idx}`}
                />
              ))}
            </Tabs>
          </Box>

          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Box sx={{ color: "primary.main", mb: 1.5 }}>
              <M3Icon name={tabs[tabIndex].icon} size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {tabs[tabIndex].label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
              Конфигурация параметров вкладки реализуется в спринте С2 (TUSS-FE-25).
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}
