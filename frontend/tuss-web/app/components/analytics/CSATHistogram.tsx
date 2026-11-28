// app/components/analytics/CSATHistogram.tsx
import React from "react";
import { Box, Card, Stack, Typography, LinearProgress, Skeleton } from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { CSATDistributionItem } from "~/types/analytics";

interface CSATHistogramProps {
  data: CSATDistributionItem[];
  isLoading?: boolean;
}

export const CSATHistogram: React.FC<CSATHistogramProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card
        data-testid="csat-histogram-skeleton"
        sx={{
          p: 2.5,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          height: 320,
        }}
      >
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={24} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Card>
    );
  }

  // Сортируем от 5 звезд к 1 звезде
  const sortedData = [...data].sort((a, b) => b.rating - a.rating);
  const totalVotes = sortedData.reduce((acc, curr) => acc + curr.count, 0);
  const isEmpty = totalVotes === 0;

  return (
    <Card
      data-testid="csat-histogram"
      sx={{
        p: 2.5,
        borderRadius: 1.5,
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
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Распределение оценок CSAT
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Исключены тикеты, закрытые без оценки клиентом
            </Typography>
          </div>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            Всего оценок: {totalVotes}
          </Typography>
        </Stack>

        {isEmpty ? (
          <Box
            data-testid="csat-empty"
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC",
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Оценок за выбранный период не поступало
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {sortedData.map((item) => {
              // Цвет для звезд (5 и 4 — зеленые, 3 — желтая, 2 и 1 — оранжевая/красная)
              let barColor = "#16694E";
              if (item.rating === 3) barColor = "#D97706";
              if (item.rating <= 2) barColor = "#BA1A1A";

              return (
                <Box key={item.rating} data-testid={`csat-row-${item.rating}`}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {/* Количество звезд */}
                    <Stack
                      direction="row"
                      spacing={0.25}
                      sx={{ alignItems: "center", width: 55, flexShrink: 0 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {item.rating}
                      </Typography>
                      <Box sx={{ color: "#D97706", display: "flex", alignItems: "center" }}>
                        <M3Icon name="star" size={16} />
                      </Box>
                    </Stack>

                    {/* Полоса прогресса */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 10,
                          borderRadius: 1,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#F1F4FB",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 1,
                            backgroundColor: barColor,
                          },
                        }}
                      />
                    </Box>

                    {/* Доля и процент */}
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        width: 95,
                        justifyContent: "flex-end",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {item.count} шт.
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          fontVariantNumeric: "tabular-nums",
                          width: 38,
                          textAlign: "right",
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
    </Card>
  );
};
