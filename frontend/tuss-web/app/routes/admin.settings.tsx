// app/routes/admin.settings.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Tabs,
  Tab,
  Snackbar,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import {
  CompanyProfileTab,
  TelegramBotTab,
  FAQSettingsTab,
  ScheduleSettingsTab,
  SLASettingsTab,
} from "~/components/settings";

export function meta() {
  return [
    { title: "Настройки компании — TUSS Admin" },
    {
      name: "description",
      content: "Конфигурация компании, Telegram-бота, расписания, SLA и базы знаний FAQ",
    },
  ];
}

export default function AdminSettingsRoute() {
  const [tabIndex, setTabIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tabs = [
    { label: "Компания", icon: "business", testId: "tab-company" },
    { label: "Telegram-бот", icon: "smart_toy", testId: "tab-bot" },
    { label: "FAQ", icon: "question_answer", testId: "tab-faq" },
    { label: "Расписание", icon: "schedule", testId: "tab-schedule" },
    { label: "SLA", icon: "verified", testId: "tab-sla" },
  ];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1100, mx: "auto", pb: 5 }}>
        {/* Заголовок страницы */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
              Настройки компании
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Управление профилем компании, интеграцией с Telegram Bot API, расписанием смен и нормативами SLA
            </Typography>
          </div>
        </Stack>

        {/* Контейнер настроек с 5 независимыми вкладками (TUSS-FE-25..29) */}
        <Card
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "none",
            overflow: "hidden",
          }}
        >
          {/* Полоса переключения вкладок */}
          <Box
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              px: { xs: 1, sm: 2 },
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC",
            }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, val) => setTabIndex(val)}
              variant="scrollable"
              scrollButtons="auto"
              data-testid="settings-tabs"
            >
              {tabs.map((tab, idx) => (
                <Tab
                  key={tab.label}
                  icon={<M3Icon name={tab.icon} size={18} />}
                  iconPosition="start"
                  label={tab.label}
                  id={`settings-tab-${idx}`}
                  data-testid={tab.testId}
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    minHeight: 48,
                    textTransform: "none",
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {/* Содержимое активной вкладки с локальным сохранением */}
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {tabIndex === 0 && <CompanyProfileTab onSuccessToast={setToastMessage} />}
            {tabIndex === 1 && <TelegramBotTab onSuccessToast={setToastMessage} />}
            {tabIndex === 2 && <FAQSettingsTab onSuccessToast={setToastMessage} />}
            {tabIndex === 3 && <ScheduleSettingsTab onSuccessToast={setToastMessage} />}
            {tabIndex === 4 && <SLASettingsTab onSuccessToast={setToastMessage} />}
          </CardContent>
        </Card>

        {/* Уведомление об успешном сохранении */}
        <Snackbar
          open={!!toastMessage}
          autoHideDuration={4000}
          onClose={() => setToastMessage(null)}
          message={toastMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        />
      </Box>
    </RoleGuard>
  );
}