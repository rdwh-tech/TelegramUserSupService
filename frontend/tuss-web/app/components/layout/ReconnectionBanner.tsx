// app/components/layout/ReconnectionBanner.tsx
import React from "react";
import { Box, Alert, Typography, CircularProgress, Collapse } from "@mui/material";
import { useWebSocket } from "~/context/WebSocketContext";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";

export const ReconnectionBanner: React.FC = () => {
  const { status, reconnect } = useWebSocket();

  const isReconnecting = status === "reconnecting" || status === "connecting";
  const isDisconnected = status === "disconnected";
  const isVisible = isReconnecting || isDisconnected;

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      data-testid="reconnection-banner"
      sx={{
        width: "100%",
        position: "relative",
        zIndex: (theme) => theme.zIndex.appBar - 1,
      }}
    >
        {isReconnecting && (
          <Alert
            severity="warning"
            icon={<CircularProgress size={16} color="warning" thickness={5} />}
            sx={{
              borderRadius: 0,
              py: 0.6,
              px: { xs: 2, sm: 3 },
              alignItems: "center",
              borderLeft: "none",
              borderRight: "none",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Соединение потеряно. Выполняется восстановление...
            </Typography>
          </Alert>
        )}

        {isDisconnected && (
          <Alert
            severity="error"
            icon={<M3Icon name="wifi_off" size={20} />}
            action={
              <M3Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={reconnect}
                data-testid="reconnect-button"
                sx={{
                  py: 0.3,
                  px: 1.5,
                  fontSize: "0.775rem",
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                Повторить
              </M3Button>
            }
            sx={{
              borderRadius: 0,
              py: 0.6,
              px: { xs: 2, sm: 3 },
              alignItems: "center",
              borderLeft: "none",
              borderRight: "none",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Соединение с сервером потеряно. Проверьте интернет-соединение.
            </Typography>
          </Alert>
        )}
      </Box>
  );
};
