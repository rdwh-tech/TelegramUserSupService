// app/components/chat/MessageItem.tsx
import React from "react";
import {
  Box,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  Card,
  CardMedia,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { TicketMessage, MessageAttachment } from "~/types/message";

export interface ExtendedMessage extends TicketMessage {
  deliveryStatus?: "sending" | "delivered" | "failed";
}

export interface MessageItemProps {
  message: ExtendedMessage;
  onRetry?: (messageId: string) => void;
  onImageClick?: (imageUrl: string, fileName?: string) => void;
}

export function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRetry,
  onImageClick,
}) => {
  const isOperator = message.senderType === "operator";
  const isSystem = message.senderType === "system";

  // Статус доставки: берем явный deliveryStatus или дефолт по isDelivered
  const status: "sending" | "delivered" | "failed" =
    message.deliveryStatus || (message.isDelivered ? "delivered" : "sending");

  if (isSystem) {
    return (
      <Box sx={{ alignSelf: "center", my: 1, maxWidth: "80%" }}>
        <Box
          data-testid={`system-message-${message.id}`}
          sx={{
            px: 2,
            py: 0.75,
            borderRadius: 9999,
            bgcolor: "#F1F4FB",
            color: "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {message.text}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      data-testid={`message-item-${message.id}`}
      data-sender={message.senderType}
      data-status={status}
      sx={{
        alignSelf: isOperator ? "flex-end" : "flex-start",
        maxWidth: { xs: "85%", sm: "70%" },
        display: "flex",
        flexDirection: "column",
        alignItems: isOperator ? "flex-end" : "flex-start",
        mb: 1.5,
      }}
    >
      {/* Имя отправителя */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: "text.secondary",
          px: 1,
          mb: 0.25,
          display: "block",
        }}
      >
        {message.senderName || (isOperator ? "Служба поддержки" : "Клиент")}
      </Typography>

      {/* Пузырь сообщения */}
      <Box
        sx={{
          position: "relative",
          p: 1.75,
          borderRadius: 2,
          borderTopRightRadius: isOperator ? 0.5 : 2,
          borderTopLeftRadius: !isOperator ? 0.5 : 2,
          bgcolor: isOperator ? "#D8E2FF" : "#FFFFFF",
          color: isOperator ? "#001A41" : "text.primary",
          border: isOperator ? "none" : "1px solid rgba(196, 198, 208, 0.4)",
          boxShadow: isOperator
            ? "0 1px 4px rgba(0, 90, 193, 0.12)"
            : "0 1px 4px rgba(0, 0, 0, 0.05)",
          wordBreak: "break-word",
        }}
      >
        {/* Вложения (если есть) */}
        {message.attachments && message.attachments.length > 0 && (
          <Stack spacing={1} sx={{ mb: message.text ? 1.5 : 0 }}>
            {message.attachments.map((att) => {
              const isPhoto = att.fileType === "photo";
              return isPhoto ? (
                <Box
                  key={att.id}
                  onClick={() => onImageClick?.(att.fileUrl, att.fileName)}
                  sx={{
                    borderRadius: 1.5,
                    overflow: "hidden",
                    cursor: "pointer",
                    maxWidth: 280,
                    maxHeight: 200,
                    border: "1px solid rgba(0,0,0,0.08)",
                    transition: "transform 0.15s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <img
                    src={att.fileUrl}
                    alt={att.fileName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </Box>
              ) : (
                <Box
                  key={att.id}
                  component="a"
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: isOperator ? "rgba(255, 255, 255, 0.6)" : "#F1F4FB",
                    color: "inherit",
                    textDecoration: "none",
                    border: "1px solid rgba(196, 198, 208, 0.3)",
                    maxWidth: 280,
                    "&:hover": { bgcolor: isOperator ? "rgba(255, 255, 255, 0.8)" : "#E7ECF7" },
                  }}
                >
                  <M3Icon name="description" size={24} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {att.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(att.fileSizeBytes)}
                    </Typography>
                  </Box>
                  <M3Icon name="download" size={18} />
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Текст сообщения */}
        {message.text && (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              fontSize: "0.9375rem",
              lineHeight: 1.45,
            }}
          >
            {message.text}
          </Typography>
        )}

        {/* Мета-информация (время и статус доставки) */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 0.5,
            color: isOperator ? "#344B71" : "text.secondary",
          }}
        >
          <Typography variant="caption" sx={{ fontSize: "0.6875rem", fontWeight: 600 }}>
            {formatMessageTime(message.createdAt)}
          </Typography>

          {isOperator && (
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              {status === "sending" && (
                <Tooltip title="Отправляется в Telegram..." arrow>
                  <span>
                    <M3Icon name="schedule" size={14} />
                  </span>
                </Tooltip>
              )}

              {status === "delivered" && (
                <Tooltip title="Доставлено клиенту в Telegram" arrow>
                  <span>
                    <M3Icon name="done_all" size={15} />
                  </span>
                </Tooltip>
              )}

              {status === "failed" && (
                <Tooltip title="Ошибка доставки. Нажмите для повторной отправки" arrow>
                  <Box sx={{ color: "error.main", display: "inline-flex", alignItems: "center" }}>
                    <M3Icon name="error_outline" size={15} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          )}
        </Stack>
      </Box>

      {/* Кнопка повторной отправки при ошибке */}
      {isOperator && status === "failed" && onRetry && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.5, px: 0.5 }}>
          <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
            Не доставлено
          </Typography>
          <IconButton
            size="small"
            color="error"
            onClick={() => onRetry(message.id)}
            sx={{ p: 0.25 }}
            title="Повторить отправку"
          >
            <M3Icon name="refresh" size={16} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
};
