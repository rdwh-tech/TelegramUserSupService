// app/components/analytics/TicketVolumeChart.tsx
import React, { useState } from "react";
import { Box, Card, Stack, Typography, Skeleton } from "@mui/material";
import type { TicketVolumePoint } from "~/types/analytics";

interface TicketVolumeChartProps {
  data: TicketVolumePoint[];
  isLoading?: boolean;
}

export const TicketVolumeChart: React.FC<TicketVolumeChartProps> = ({ data, isLoading = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card
        data-testid="ticket-volume-chart-skeleton"
        sx={{
          p: 2.5,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          height: 320,
        }}
      >
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
      </Card>
    );
  }

  const isEmpty = !data || data.length === 0;

  // Рассчитываем максимальное значение для масштабирования
  const maxCount = isEmpty
    ? 10
    : Math.max(...data.map((d) => Math.max(d.createdCount, d.closedCount)), 5);
  const chartHeight = 180;
  const paddingX = 40;
  const chartWidth = 520;

  return (
    <Card
      data-testid="ticket-volume-chart"
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
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Динамика обращений
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Соотношение поступивших и решенных тикетов
            </Typography>
          </div>

          {/* Легенда */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "primary.main" }} />
              <Typography variant="caption" color="text.secondary">
                Поступило
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#16694E" }} />
              <Typography variant="caption" color="text.secondary">
                Закрыто
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        {isEmpty ? (
          <Box
            data-testid="ticket-volume-empty"
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
              Нет данных об обращениях за выбранный период
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
              style={{ width: "100%", height: 220, overflow: "visible" }}
            >
              {/* Горизонтальные направляющие линии сетки */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - ratio * chartHeight + 10;
                const val = Math.round(ratio * maxCount);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.08}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      fill="currentColor"
                      fillOpacity={0.5}
                      fontSize={10}
                      textAnchor="end"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Столбики / полосы для каждого таймстемпа */}
              {data.map((point, i) => {
                const step = (chartWidth - paddingX - 20) / (data.length || 1);
                const xCenter = paddingX + 20 + i * step;
                const barWidth = Math.min(step * 0.35, 16);

                const createdHeight = (point.createdCount / maxCount) * chartHeight;
                const closedHeight = (point.closedCount / maxCount) * chartHeight;

                const yCreated = chartHeight - createdHeight + 10;
                const yClosed = chartHeight - closedHeight + 10;

                const isHovered = hoveredIndex === i;

                return (
                  <g
                    key={point.timestamp}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Фон при ховере */}
                    {isHovered && (
                      <rect
                        x={xCenter - step / 2}
                        y={5}
                        width={step}
                        height={chartHeight + 25}
                        fill="currentColor"
                        fillOpacity={0.04}
                        rx={4}
                      />
                    )}

                    {/* Поступило (Primary) */}
                    <rect
                      x={xCenter - barWidth - 1}
                      y={yCreated}
                      width={barWidth}
                      height={createdHeight}
                      fill="#0077D6"
                      rx={2}
                      opacity={isHovered ? 1 : 0.85}
                    />

                    {/* Закрыто (Green) */}
                    <rect
                      x={xCenter + 1}
                      y={yClosed}
                      width={barWidth}
                      height={closedHeight}
                      fill="#16694E"
                      rx={2}
                      opacity={isHovered ? 1 : 0.85}
                    />

                    {/* Подпись по оси X */}
                    <text
                      x={xCenter}
                      y={chartHeight + 25}
                      fill="currentColor"
                      fillOpacity={isHovered ? 1 : 0.6}
                      fontSize={11}
                      fontWeight={isHovered ? 600 : 400}
                      textAnchor="middle"
                    >
                      {point.timestamp}
                    </text>

                    {/* Значения при ховере */}
                    {isHovered && (
                      <g>
                        <rect
                          x={xCenter - 45}
                          y={Math.min(yCreated, yClosed) - 34}
                          width={90}
                          height={28}
                          rx={4}
                          fill="#1E232B"
                          opacity={0.92}
                        />
                        <text
                          x={xCenter}
                          y={Math.min(yCreated, yClosed) - 16}
                          fill="#FFFFFF"
                          fontSize={10}
                          fontWeight={600}
                          textAnchor="middle"
                        >
                          +{point.createdCount} / -{point.closedCount}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </Box>
        )}
      </Box>
    </Card>
  );
};
