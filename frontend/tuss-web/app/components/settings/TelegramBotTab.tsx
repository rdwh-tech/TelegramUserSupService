// app/components/settings/TelegramBotTab.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Stack,
  Alert,
  Chip,
  Card,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { companyApi } from "~/api/company";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";

interface TelegramBotTabProps {
  onSuccessToast: (msg: string) => void;
}

export const TelegramBotTab: React.FC<TelegramBotTabProps> = ({ onSuccessToast }) => {
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceTokenInput, setReplaceTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  const {
    data: botConfig,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "bot"],
    queryFn: () => companyApi.getBotConfig(),
  });

  useEffect(() => {
    if (botConfig) {
      setWelcomeMessage(botConfig.welcomeMessage || "");
      if (botConfig.botToken) {
        setTokenInput(botConfig.botToken);
      }
    }
  }, [botConfig]);

  const updateBotMutation = useMutation({
    mutationFn: (payload: { botToken?: string; welcomeMessage?: string }) =>
      companyApi.updateBotConfig(payload),
    onSuccess: () => {
      setError(null);
      refetch();
      onSuccessToast("Параметры Telegram-бота успешно сохранены");
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Не удалось подключить Telegram-бота. Проверьте токен");
    },
  });

  const replaceBotMutation = useMutation({
    mutationFn: (newToken: string) => companyApi.updateBotConfig({ botToken: newToken }),
    onSuccess: () => {
      setIsReplaceModalOpen(false);
      setReplaceTokenInput("");
      setReplaceError(null);
      refetch();
      onSuccessToast("Telegram-бот успешно заменен, новые сессии активированы");
    },
    onError: (err: any) => {
      setReplaceError(err?.response?.data?.message || "Не удалось подключить Telegram-бота. Проверьте токен");
    },
  });

  // Сохранение токена при первичной настройке
  const handleConnectBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !tokenInput.includes(":")) {
      setError("Не удалось подключить Telegram-бота. Проверьте токен");
      return;
    }
    setError(null);
    updateBotMutation.mutate({ botToken: tokenInput.trim() });
  };

  // Сохранение приветственного сообщения
  const handleSaveWelcome = (e: React.FormEvent) => {
    e.preventDefault();
    updateBotMutation.mutate({ welcomeMessage: welcomeMessage.trim() });
  };

  const handleConfirmReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTokenInput.trim() || !replaceTokenInput.includes(":")) {
      setReplaceError("Не удалось подключить Telegram-бота. Проверьте токен");
      return;
    }
    setReplaceError(null);
    replaceBotMutation.mutate(replaceTokenInput.trim());
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 640, py: 2 }}>
        <Skeleton variant="text" width={240} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1.5, mb: 2.5 }} />
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1.5 }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <M3Button color="inherit" size="small" onClick={() => refetch()}>
            Повторить
          </M3Button>
        }
        sx={{ borderRadius: 1.5, my: 2 }}
      >
        Не удалось загрузить параметры интеграции с Telegram-ботом
      </Alert>
    );
  }

  const isConnected = !!botConfig?.isConnected;

  return (
    <Box sx={{ maxWidth: 680, py: 1 }} data-testid="telegram-bot-tab">
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Интеграция с Telegram-ботом
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Подключение официального бота компании через Telegram Bot API для приема и маршрутизации обращений
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }} data-testid="bot-error-alert">
          {error}
        </Alert>
      )}

      {/* Статус подключения бота */}
      <Card
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "none",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 1.5,
                bgcolor: isConnected ? "success.main" : "text.disabled",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <M3Icon name="smart_toy" size={24} />
            </Box>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {isConnected ? `@${botConfig?.botUsername || "Telegram_Bot"}` : "Бот не подключен"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isConnected
                  ? "Бот активен и принимает обращения клиентов"
                  : "Укажите токен Bot API, полученный у @BotFather"}
              </Typography>
            </div>
          </Stack>

          <Chip
            label={isConnected ? "Подключен" : "Не подключен"}
            color={isConnected ? "success" : "default"}
            variant={isConnected ? "filled" : "outlined"}
            size="small"
            data-testid="bot-status-chip"
            sx={{ fontWeight: 600, fontSize: "0.75rem" }}
          />
        </Stack>

        {/* Управление токеном */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          {isConnected ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                Токен: {botConfig?.botToken ? `${botConfig.botToken.slice(0, 8)}••••••••••••` : "••••••••"}
              </Typography>
              <M3Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<M3Icon name="swap_horiz" size={16} />}
                onClick={() => setIsReplaceModalOpen(true)}
                data-testid="open-replace-bot-modal-btn"
              >
                Заменить бота
              </M3Button>
            </Stack>
          ) : (
            <form onSubmit={handleConnectBot}>
              <Stack spacing={2}>
                <TextField
                  label="Токен Bot API"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    if (error) setError(null);
                  }}
                  type={showToken ? "text" : "password"}
                  fullWidth
                  required
                  disabled={updateBotMutation.isPending}
                  slotProps={{
                    htmlInput: {
                      "data-testid": "bot-token-input",
                      style: { fontFamily: "monospace" },
                    },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowToken(!showToken)}
                            edge="end"
                            size="small"
                          >
                            <M3Icon name={showToken ? "visibility_off" : "visibility"} size={18} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText="Получите токен у официального бота Telegram @BotFather"
                />

                <Box>
                  <M3Button
                    type="submit"
                    variant="contained"
                    disabled={updateBotMutation.isPending || !tokenInput.trim()}
                    data-testid="connect-bot-btn"
                  >
                    {updateBotMutation.isPending ? "Подключение..." : "Подключить бота"}
                  </M3Button>
                </Box>
              </Stack>
            </form>
          )}
        </Box>
      </Card>

      {/* Редактор приветственного сообщения (команда /start) */}
      <Card
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "none",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Приветственное сообщение (/start)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Текст, который клиент видит в Telegram при первом запуске бота или перезапуске диалога
        </Typography>

        <form onSubmit={handleSaveWelcome}>
          <Stack spacing={2}>
            <TextField
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="Здравствуйте! Вы обратились в службу поддержки. Опишите ваш вопрос..."
              disabled={updateBotMutation.isPending}
              slotProps={{
                htmlInput: {
                  "data-testid": "bot-welcome-input",
                },
              }}
            />

            <Box>
              <M3Button
                type="submit"
                variant="outlined"
                disabled={updateBotMutation.isPending}
                data-testid="save-welcome-btn"
              >
                {updateBotMutation.isPending ? "Сохранение..." : "Сохранить приветствие"}
              </M3Button>
            </Box>
          </Stack>
        </form>
      </Card>

      {/* Критическое модальное окно замены бота (TUSS-FE-26) */}
      <Dialog
        open={isReplaceModalOpen}
        onClose={() => !replaceBotMutation.isPending && setIsReplaceModalOpen(false)}
        maxWidth="xs"
        fullWidth
        data-testid="replace-bot-modal"
        slotProps={{
          paper: {
            sx: { borderRadius: 2, p: 1 },
          },
        }}
      >
        <form onSubmit={handleConfirmReplace}>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <M3Icon name="warning" size={20} />
              </Box>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Заменить Telegram-бота?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Критическое действие для текущих сессий
                </Typography>
              </div>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ pt: 1.5 }}>
            {replaceError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.825rem" }} data-testid="replace-error-alert">
                {replaceError}
              </Alert>
            )}

            <Box
              sx={{
                p: 1.75,
                mb: 2.5,
                borderRadius: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(186, 26, 26, 0.12)" : "rgba(186, 26, 26, 0.06)",
                border: "1px solid",
                borderColor: "error.main",
              }}
            >
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, display: "block", lineHeight: 1.4 }}>
                Внимание: замена токена бота приведет к принудительному сбросу всех активных сессий клиентов и остановке текущих диалогов.
              </Typography>
            </Box>

            <TextField
              label="Новый токен Bot API"
              value={replaceTokenInput}
              onChange={(e) => {
                setReplaceTokenInput(e.target.value);
                if (replaceError) setReplaceError(null);
              }}
              fullWidth
              required
              autoFocus
              type="password"
              disabled={replaceBotMutation.isPending}
              slotProps={{
                htmlInput: {
                  "data-testid": "replace-token-input",
                  style: { fontFamily: "monospace" },
                },
              }}
              helperText="Укажите новый валидный токен от @BotFather"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
            <M3Button
              variant="text"
              onClick={() => setIsReplaceModalOpen(false)}
              disabled={replaceBotMutation.isPending}
            >
              Отмена
            </M3Button>
            <M3Button
              type="submit"
              variant="contained"
              color="error"
              disabled={replaceBotMutation.isPending || !replaceTokenInput.trim()}
              data-testid="confirm-replace-bot-btn"
            >
              {replaceBotMutation.isPending ? "Замена..." : "Заменить бота"}
            </M3Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};