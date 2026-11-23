// app/components/chat/MessageComposer.tsx
import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";

export interface MessageComposerProps {
  onSendMessage: (text: string, files: File[]) => Promise<void>;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 МБ (SRS FR-WEB-11)
const ALLOWED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt,.zip";

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  disabled = false,
  isSending = false,
  placeholder = "Напишите ответ клиенту... (Enter для отправки, Shift + Enter для новой строки)",
}) => {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = (text.trim().length > 0 || attachedFiles.length > 0) && !disabled && !isSending;

  const handleSend = async () => {
    if (!canSend) return;

    const currentText = text;
    const currentFiles = [...attachedFiles];
    setFileError(null);

    try {
      await onSendMessage(currentText, currentFiles);
      // Очищаем поле только при успешной отправке
      setText("");
      setAttachedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Ошибка при отправке сообщения:", err);
      // Текст и вложения сохраняются в форме при сетевом сбое (FR-WEB-11)
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    let oversizedFileName: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFileName = file.name;
        break;
      }
      newFiles.push(file);
    }

    if (oversizedFileName) {
      setFileError(
        `Файл «${oversizedFileName}» слишком большой. Максимальный размер вложения — 20 МБ.`
      );
    } else {
      setFileError(null);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }

    // Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box
      data-testid="message-composer"
      sx={{
        p: 2,
        borderTop: "1px solid rgba(196, 198, 208, 0.4)",
        bgcolor: "#FFFFFF",
      }}
    >
      {/* Ошибка валидации размера файла */}
      {fileError && (
        <Alert
          severity="warning"
          onClose={() => setFileError(null)}
          sx={{ mb: 1.5, borderRadius: 2.5 }}
        >
          {fileError}
        </Alert>
      )}

      {/* Список прикрепленных файлов (чипы) */}
      {attachedFiles.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: 1 }}>
          {attachedFiles.map((file, idx) => (
            <Chip
              key={idx}
              label={`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} МБ)`}
              size="small"
              onDelete={() => handleRemoveFile(idx)}
              icon={
                file.type.startsWith("image/") ? (
                  <M3Icon name="image" size={16} />
                ) : (
                  <M3Icon name="description" size={16} />
                )
              }
              sx={{ bgcolor: "#F1F4FB", borderRadius: 2 }}
            />
          ))}
        </Stack>
      )}

      {/* Скрытый input для выбора файлов */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept={ALLOWED_EXTENSIONS}
        style={{ display: "none" }}
        data-testid="file-upload-input"
      />

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-end" }}>
        {/* Кнопка скрепки для вложений */}
        <Tooltip title="Прикрепить файл или скриншот (до 20 МБ)" arrow>
          <span>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSending}
              color="primary"
              data-testid="attach-file-button"
              sx={{
                p: 1.25,
                bgcolor: "#F8F9FE",
                border: "1px solid rgba(196, 198, 208, 0.4)",
                "&:hover": { bgcolor: "#E7EDFA" },
              }}
            >
              <M3Icon name="attach_file" size={20} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Текстовое поле ввода */}
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          placeholder={disabled ? "Диалог закрыт или доступен только для чтения" : placeholder}
          variant="outlined"
          size="small"
          slotProps={{
            htmlInput: {
              "data-testid": "message-input-textarea",
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              bgcolor: disabled ? "#F8F9FE" : "#FAFAFD",
              fontSize: "0.9375rem",
            },
          }}
        />

        {/* Кнопка отправки сообщения */}
        <Tooltip title={canSend ? "Отправить (Enter)" : "Введите текст или прикрепите файл"} arrow>
          <span>
            <IconButton
              onClick={handleSend}
              disabled={!canSend}
              color="primary"
              data-testid="send-message-button"
              sx={{
                p: 1.25,
                bgcolor: canSend ? "primary.main" : "#E2E2E6",
                color: canSend ? "#FFFFFF" : "#74777F",
                "&:hover": {
                  bgcolor: canSend ? "primary.dark" : "#E2E2E6",
                },
                "&.Mui-disabled": {
                  bgcolor: "#E2E2E6",
                  color: "#A0A2AA",
                },
              }}
            >
              {isSending ? (
                <CircularProgress size={20} color="inherit" thickness={5} />
              ) : (
                <M3Icon name="send" size={20} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};
