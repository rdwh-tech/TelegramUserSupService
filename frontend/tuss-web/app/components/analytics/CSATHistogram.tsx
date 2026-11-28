// app/components/analytics/CSATHistogram.tsx
import React, { useState } from "react";
import {
  Box,
  Card,
  Stack,
  Typography,
  LinearProgress,
  Skeleton,
  useTheme,
  Chip,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { CSATDistributionItem } from "~/types/analytics";

interface CSATHistogramProps {
  data: CSATDistributionItem[];
  isLoading?: boolean;
}

export const CSATHistogram: React.FC<CSATHistogramProps> = ({ data, isLoading = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card
        data-testid="csat-histogram-skeleton"
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          height: 340,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
          <Skeleton variant="text" width={180} height={28} />
          <Skeleton variant="rectangular" width={60} height={28} sx={{ borderRadius: 1 }} />
        </Stack>
        <Stack spacing={2} sx={{ mt: 2.5 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={26} sx={{ borderRadius: 1.5 }} />
          ))}
        </Stack>
      </Card>
    );
  }

  // Сортируем от 5 звезд к 1 звезде
  const sortedData = [...data].sort((a, b) => b.rating - a.rating);
  const totalVotes = sortedData.reduce((acc, curr) => acc + curr.count, 0);
  const isEmpty = totalVotes === 0;

  // Рассчитываем средневзвешенный балл
  const avgRating =
    totalVotes > 0
      ? (sortedData.reduce((acc, curr) => acc + curr.rating * curr.count, 0) / totalVotes).toFixed(2)
      : null;

  return (
    <Card
      data-testid="csat-histogram"
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "none",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box>
        {/* Заголовок и M3 Tonal бейдж средней оценки */}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2.5,
          }}
        >
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Распределение оценок CSAT
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Исключены тикеты, закрытые без оценки клиентом
            </Typography>
          </div>

          {/* M3 Tonal Score Badge */}
          {avgRating && (
            <Chip
              icon={
                <Box sx={{ color: "#F59E0B", display: "flex", alignItems: "center" }}>
                  <M3Icon name="star" size={16} />
                </Box>
              }
              label={`${avgRating} / 5.00`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.8rem",
                fontVariantNumeric: "tabular-nums",
                bgcolor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)",
                color: isDark ? "#FBBF24" : "#B45309",
                border: "1px solid",
                borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.2)",
              }}
            />
          )}
        </Stack>

        {isEmpty ? (
          <Box
            data-testid="csat-empty"
            sx={{
              height: 230,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
              borderRadius: 1.5,
              border: "1px dashed",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Оценок за выбранный период не поступало
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {sortedData.map((item) => {
              // Цветовая дифференциация оценок в Material 3
              let barColor = isDark ? "#4ADE80" : "#16694E"; // 5 и 4 звезды (Success)
              if (item.rating === 3) barColor = isDark ? "#FBBF24" : "#D97706"; // 3 звезды (Warning)
              if (item.rating <= 2) barColor = isDark ? "#F87171" : "#BA1A1A"; // 1 и 2 звезды (Error)

              const isHovered = hoveredRating === item.rating;

              return (
                <Box
                  key={item.rating}
                  data-testid={`csat-row-${item.rating}`}
                  onMouseEnter={() => setHoveredRating(item.rating)}
                  onMouseLeave={() => setHoveredRating(null)}
                  sx={{
                    p: 0.75,
                    px: 1,
                    borderRadius: 1.5,
                    bgcolor: isHovered
                      ? isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(0, 90, 193, 0.04)"
                      : "transparent",
                    transition: "all 0.15s ease",
                    cursor: "default",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {/* Количество звезд */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "center", width: 50, flexShrink: 0 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.rating}
                      </Typography>
                      <Box sx={{ color: "#F59E0B", display: "flex", alignItems: "center" }}>
                        <M3Icon name="star" size={16} />
                      </Box>
                    </Stack>

                    {/* M3 Капсульный прогресс-бар */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 6,
                            backgroundColor: barColor,
                            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          },
                        }}
                      />
                    </Box>

                    {/* Подсчет количества и процентов */}
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        width: 100,
                        justifyContent: "flex-end",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.75rem" }}
                      >
                        {item.count} шт.
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.825rem",
                          fontVariantNumeric: "tabular-nums",
                          width: 44,
                          textAlign: "right",
                          color: isHovered ? "text.primary" : "text.secondary",
                        }}
                      >
                        {item.percentage}%
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Футер карточки с общим числом голосов */}
      {!isEmpty && (
        <Box
          sx={{
            pt: 1.5,
            mt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Удовлетворенность обслуживанием
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
          >
            Всего оценок: {totalVotes}
          </Typography>
        </Box>
      )}
    </Card>
  );
};