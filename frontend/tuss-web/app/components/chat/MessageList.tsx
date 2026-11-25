// app/components/chat/MessageList.tsx
import React, { useRef, useEffect } from "react";
import { Box, Typography, Chip, Stack } from "@mui/material";
import { MessageItem, type ExtendedMessage } from "./MessageItem";
import { M3Icon } from "~/components/ui/M3Icon";

export interface MessageListProps {
  messages: ExtendedMessage[];
  isLoading?: boolean;
  onRetry?: (messageId: string) => void;
  onImageClick?: (imageUrl: string, fileName?: string) => void;
}

export function formatDateSeparator(isoString: string): string {
  try {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return isoString;
  }
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  onRetry,
  onImageClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Автоматический скролл вниз при добавлении сообщений
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <Box
        data-testid="message-list-loading"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">Загрузка переписки...</Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        data-testid="message-list-empty"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          p: 4,
          color: "text.secondary",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#F1F4FB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <M3Icon name="forum" size={28} />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Диалог начат
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 360 }}>
          Сообщения от клиента Telegram появятся здесь в реальном времени.
        </Typography>
      </Box>
    );
  }

  // Группировка сообщений по датам
  const groups: { dateKey: string; items: ExtendedMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = formatDateSeparator(msg.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.dateKey === dateKey) {
      lastGroup.items.push(msg);
    } else {
      groups.push({ dateKey, items: [msg] });
    }
  });

  return (
    <Box
      data-testid="message-list"
      sx={{
        flex: 1,
        p: { xs: 1.5, sm: 2.5 },
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {groups.map((group, groupIdx) => (
        <React.Fragment key={groupIdx}>
          {/* Разделитель дат */}
          <Box sx={{ alignSelf: "center", my: 2 }}>
            <Chip
              label={group.dateKey}
              size="small"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#F1F4FB",
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.75rem",
                borderRadius: 1,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "divider",
              }}
            />
          </Box>

          {/* Сообщения за эту дату */}
          {group.items.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onRetry={onRetry}
              onImageClick={onImageClick}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Якорь для автоскролла вниз */}
      <div ref={messagesEndRef} data-testid="messages-bottom-anchor" />
    </Box>
  );
};
