// app/components/settings/FAQSettingsTab.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Skeleton,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyApi } from "~/api/company";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import type { FAQItem, CreateFAQPayload, UpdateFAQPayload } from "~/types/faq";

interface FAQSettingsTabProps {
  onSuccessToast: (msg: string) => void;
}

export const FAQSettingsTab: React.FC<FAQSettingsTabProps> = ({ onSuccessToast }) => {
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FAQItem | null>(null);

  const [questionInput, setQuestionInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const {
    data: faqs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "faqs"],
    queryFn: () => companyApi.getFAQs(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateFAQPayload) => companyApi.createFAQ(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "faqs"] });
      setIsCreateModalOpen(false);
      setQuestionInput("");
      setAnswerInput("");
      onSuccessToast("Запись FAQ успешно добавлена");
    },
    onError: (err: any) => {
      setModalError(err?.response?.data?.message || "Не удалось сохранить запись FAQ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFAQPayload }) =>
      companyApi.updateFAQ(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "faqs"] });
      setEditingItem(null);
      setQuestionInput("");
      setAnswerInput("");
      onSuccessToast("Запись FAQ успешно обновлена");
    },
    onError: (err: any) => {
      setModalError(err?.response?.data?.message || "Не удалось обновить запись FAQ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companyApi.deleteFAQ(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "faqs"] });
      setDeletingItem(null);
      onSuccessToast("Запись FAQ удалена");
    },
    onError: (err: any) => {
      setModalError(err?.response?.data?.message || "Не удалось удалить запись");
    },
  });

  const handleOpenCreate = () => {
    setQuestionInput("");
    setAnswerInput("");
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (item: FAQItem) => {
    setEditingItem(item);
    setQuestionInput(item.question);
    setAnswerInput(item.answer);
    setModalError(null);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !answerInput.trim()) {
      setModalError("Вопрос и ответ обязательны для заполнения");
      return;
    }
    setModalError(null);
    createMutation.mutate({
      question: questionInput.trim(),
      answer: answerInput.trim(),
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!questionInput.trim() || !answerInput.trim()) {
      setModalError("Вопрос и ответ обязательны для заполнения");
      return;
    }
    setModalError(null);
    updateMutation.mutate({
      id: editingItem.id,
      payload: {
        question: questionInput.trim(),
        answer: answerInput.trim(),
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    deleteMutation.mutate(deletingItem.id);
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 800, py: 2 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1.5 }} />
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
        Не удалось загрузить базу знаний FAQ
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, py: 1 }} data-testid="faq-settings-tab">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
        }}
      >
        <div>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            База знаний FAQ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Часто задаваемые вопросы и шаблоны ответов для автоматических подсказок в Telegram-боте
          </Typography>
        </div>

        <M3Button
          variant="contained"
          size="small"
          onClick={handleOpenCreate}
          startIcon={<M3Icon name="add" size={18} />}
          data-testid="add-faq-btn"
        >
          Добавить вопрос
        </M3Button>
      </Stack>

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
        {faqs.length === 0 ? (
          <Box
            sx={{ py: 6, textAlign: "center" }}
            data-testid="faq-empty-state"
          >
            <Typography variant="body2" color="text.secondary">
              В базе знаний пока нет добавленных вопросов
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium" data-testid="faq-table">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC",
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 280 }}>
                    Вопрос
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem" }}>
                    Ответ
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 110 }}>
                    Действия
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faqs.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    data-testid={`faq-row-${item.id}`}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.question}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                        {item.answer}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: "top" }}>
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <Tooltip title="Редактировать">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(item)}
                            data-testid={`edit-faq-${item.id}`}
                          >
                            <M3Icon name="edit" size={17} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeletingItem(item)}
                            data-testid={`delete-faq-${item.id}`}
                          >
                            <M3Icon name="delete" size={17} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Модальное окно создания / редактирования записи FAQ */}
      <Dialog
        open={isCreateModalOpen || !!editingItem}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        maxWidth="sm"
        fullWidth
        data-testid="faq-modal"
        slotProps={{
          paper: { sx: { borderRadius: 2, p: 1 } },
        }}
      >
        <form onSubmit={editingItem ? handleSaveEdit : handleSaveCreate}>
          <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: "1.1rem" }}>
            {editingItem ? "Редактировать запись FAQ" : "Новый вопрос FAQ"}
          </DialogTitle>

          <DialogContent sx={{ pt: 1.5 }}>
            {modalError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.825rem" }}>
                {modalError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField
                label="Вопрос"
                value={questionInput}
                onChange={(e) => {
                  setQuestionInput(e.target.value);
                  if (modalError) setModalError(null);
                }}
                fullWidth
                required
                autoFocus
                placeholder="Например: Как восстановить пароль?"
                slotProps={{
                  htmlInput: { "data-testid": "faq-question-input" },
                }}
              />

              <TextField
                label="Ответ"
                value={answerInput}
                onChange={(e) => {
                  setAnswerInput(e.target.value);
                  if (modalError) setModalError(null);
                }}
                fullWidth
                required
                multiline
                rows={4}
                placeholder="Подробный ответ клиенту..."
                slotProps={{
                  htmlInput: { "data-testid": "faq-answer-input" },
                }}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
            <M3Button
              variant="text"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingItem(null);
              }}
            >
              Отмена
            </M3Button>
            <M3Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="submit-faq-btn"
            >
              {editingItem ? "Сохранить" : "Добавить"}
            </M3Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Модальное окно подтверждения удаления */}
      <Dialog
        open={!!deletingItem}
        onClose={() => !deleteMutation.isPending && setDeletingItem(null)}
        maxWidth="xs"
        fullWidth
        data-testid="delete-faq-modal"
        slotProps={{
          paper: { sx: { borderRadius: 2, p: 1 } },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: "1.1rem" }}>
          Удалить запись FAQ?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Вы уверены, что хотите удалить вопрос <strong>«{deletingItem?.question}»</strong>? Вопрос перестанет предлагаться клиентам в Telegram-боте.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <M3Button variant="text" onClick={() => setDeletingItem(null)}>
            Отмена
          </M3Button>
          <M3Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
            data-testid="confirm-delete-faq-btn"
          >
            {deleteMutation.isPending ? "Удаление..." : "Удалить"}
          </M3Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};