// app/components/analytics/TicketVolumeChart.tsx
import React, { useState } from "react";
import {
  Box,
  Card,
  Stack,
  Typography,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { TicketVolumePoint } from "~/types/analytics";

interface TicketVolumeChartProps {
  data: TicketVolumePoint[];
  isLoading?: boolean;
}

type ChartDisplayMode = "area" | "bar";

// Генерация плавного Catmull-Rom кубического сплайна
function getSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function getAreaPath(points: { x: number; y: number }[], baseY: number): string {
  const spline = getSplinePath(points);
  if (!spline || points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export const TicketVolumeChart: React.FC<TicketVolumeChartProps> = ({
  data,
  isLoading = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [mode, setMode] = useState<ChartDisplayMode>("area");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card
        data-testid="ticket-volume-chart-skeleton"
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
          <Skeleton variant="rectangular" width={72} height={28} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1.5 }} />
      </Card>
    );
  }

  const isEmpty = !data || data.length === 0;

  // Динамические цвета Material 3 из темы
  const primaryColor = theme.palette.primary.main;
  const closedColor = isDark ? "#4ADE80" : "#16694E";

  const chartHeight = 180;
  const paddingX = 40;
  const chartWidth = 520;
  const baseY = chartHeight + 10;

  const maxCount = isEmpty
    ? 10
    : Math.max(...data.map((d) => Math.max(d.createdCount, d.closedCount)), 5);

  // Координаты точек для графиков
  const step = data && data.length > 0 ? (chartWidth - paddingX - 25) / Math.max(data.length - 1, 1) : 0;
  const createdPoints = data.map((d, i) => ({
    x: paddingX + 15 + (data.length === 1 ? (chartWidth - paddingX - 25) / 2 : i * step),
    y: chartHeight - (d.createdCount / maxCount) * chartHeight + 10,
  }));
  const closedPoints = data.map((d, i) => ({
    x: paddingX + 15 + (data.length === 1 ? (chartWidth - paddingX - 25) / 2 : i * step),
    y: chartHeight - (d.closedCount / maxCount) * chartHeight + 10,
  }));

  const activePoint = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;
  const activeX = hoveredIndex !== null && createdPoints[hoveredIndex] ? createdPoints[hoveredIndex].x : null;

  return (
    <Card
      data-testid="ticket-volume-chart"
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
        {/* Заголовок, переключатель режима и легенда */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 2.5,
          }}
        >
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Динамика обращений
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Сравнение количества поступивших и закрытых тикетов
            </Typography>
          </div>

          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {/* Легенда Material 3 */}
            <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 12,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: primaryColor,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Поступило
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 12,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: closedColor,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Закрыто
                </Typography>
              </Stack>
            </Stack>

            {/* Переключатель вида (M3 Segmented Button) */}
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, val) => val && setMode(val as ChartDisplayMode)}
              size="small"
              sx={{
                height: 28,
                "& .MuiToggleButton-root": {
                  p: 0.5,
                  px: 0.75,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  "&.Mui-selected": {
                    bgcolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 90, 193, 0.08)",
                    color: "primary.main",
                  },
                },
              }}
            >
              <ToggleButton value="area" title="Плавный сплайн M3" data-testid="chart-mode-area">
                <M3Icon name="show_chart" size={16} />
              </ToggleButton>
              <ToggleButton value="bar" title="Капсульные столбцы M3" data-testid="chart-mode-bar">
                <M3Icon name="bar_chart" size={16} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {isEmpty ? (
          <Box
            data-testid="ticket-volume-empty"
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
              Нет данных об обращениях за выбранный период
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 45}`}
              style={{ width: "100%", height: 230, overflow: "visible" }}
            >
              <defs>
                {/* Тональные градиенты Material 3 */}
                <linearGradient id="m3PrimaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity={isDark ? "0.32" : "0.20"} />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="m3ClosedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={closedColor} stopOpacity={isDark ? "0.28" : "0.16"} />
                  <stop offset="100%" stopColor={closedColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Горизонтальная координатная сетка M3 */}
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
                      strokeOpacity={isDark ? 0.08 : 0.06}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3.5}
                      fill="currentColor"
                      fillOpacity={0.45}
                      fontSize={10}
                      fontWeight={500}
                      textAnchor="end"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Вертикальная направляющая линия активного ховера */}
              {activeX !== null && (
                <line
                  x1={activeX}
                  y1={10}
                  x2={activeX}
                  y2={baseY}
                  stroke={primaryColor}
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              {/* 1. Режим: Плавный сплайн M3 (Smooth Area Curve) */}
              {mode === "area" && (
                <>
                  {/* Тональные площади под графиками */}
                  <path d={getAreaPath(createdPoints, baseY)} fill="url(#m3PrimaryAreaGrad)" />
                  <path d={getAreaPath(closedPoints, baseY)} fill="url(#m3ClosedAreaGrad)" />

                  {/* Основные линии сплайна */}
                  <path
                    d={getSplinePath(closedPoints)}
                    fill="none"
                    stroke={closedColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  <path
                    d={getSplinePath(createdPoints)}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />

                  {/* Точки на узлах сплайна */}
                  {data.map((_, i) => {
                    const isHovered = hoveredIndex === i;
                    const cp = createdPoints[i];
                    const clp = closedPoints[i];
                    return (
                      <g key={i}>
                        <circle
                          cx={clp.x}
                          cy={clp.y}
                          r={isHovered ? 5 : 3.5}
                          fill={closedColor}
                          stroke={isDark ? "#1E232B" : "#FFFFFF"}
                          strokeWidth={isHovered ? 2 : 1.5}
                        />
                        <circle
                          cx={cp.x}
                          cy={cp.y}
                          r={isHovered ? 5 : 3.5}
                          fill={primaryColor}
                          stroke={isDark ? "#1E232B" : "#FFFFFF"}
                          strokeWidth={isHovered ? 2 : 1.5}
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* 2. Режим: Капсульные столбцы M3 (Rounded Pill Bars) */}
              {mode === "bar" && (
                <>
                  {data.map((point, i) => {
                    const barStep = (chartWidth - paddingX - 20) / (data.length || 1);
                    const xCenter = paddingX + 15 + i * barStep;
                    const barWidth = Math.min(barStep * 0.35, 14);

                    const createdHeight = (point.createdCount / maxCount) * chartHeight;
                    const closedHeight = (point.closedCount / maxCount) * chartHeight;

                    const yCreated = chartHeight - createdHeight + 10;
                    const yClosed = chartHeight - closedHeight + 10;
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={i}>
                        {/* Поступило */}
                        <rect
                          x={xCenter - barWidth - 1.5}
                          y={yCreated}
                          width={barWidth}
                          height={Math.max(createdHeight, 3)}
                          fill={primaryColor}
                          rx={Math.min(barWidth / 2, 5)}
                          opacity={isHovered ? 1 : 0.85}
                        />
                        {/* Закрыто */}
                        <rect
                          x={xCenter + 1.5}
                          y={yClosed}
                          width={barWidth}
                          height={Math.max(closedHeight, 3)}
                          fill={closedColor}
                          rx={Math.min(barWidth / 2, 5)}
                          opacity={isHovered ? 1 : 0.85}
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* Интерактивные области перехвата ховера и подписи оси X */}
              {data.map((point, i) => {
                const xCenter =
                  mode === "area"
                    ? createdPoints[i].x
                    : paddingX + 15 + i * ((chartWidth - paddingX - 20) / (data.length || 1));
                const colWidth = (chartWidth - paddingX - 10) / (data.length || 1);
                const isHovered = hoveredIndex === i;

                return (
                  <g
                    key={point.timestamp}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Невидимая область захвата мыши для всей колонки */}
                    <rect
                      x={xCenter - colWidth / 2}
                      y={5}
                      width={colWidth}
                      height={chartHeight + 35}
                      fill="transparent"
                    />

                    {/* Подпись по оси X */}
                    <text
                      x={xCenter}
                      y={chartHeight + 28}
                      fill="currentColor"
                      fillOpacity={isHovered ? 1 : 0.6}
                      fontSize={11}
                      fontWeight={isHovered ? 600 : 400}
                      textAnchor="middle"
                    >
                      {point.timestamp}
                    </text>
                  </g>
                );
              })}

              {/* Плавающий Material 3 Тултип */}
              {activePoint && activeX !== null && (
                <g>
                  {(() => {
                    const tooltipWidth = 110;
                    const tooltipHeight = 48;
                    const tipX = Math.max(
                      paddingX + 5,
                      Math.min(chartWidth - tooltipWidth - 5, activeX - tooltipWidth / 2)
                    );
                    const tipY = 8;

                    return (
                      <g>
                        {/* Карточка тултипа */}
                        <rect
                          x={tipX}
                          y={tipY}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx={8}
                          fill={isDark ? "#252B35" : "#FFFFFF"}
                          stroke="currentColor"
                          strokeOpacity={isDark ? 0.2 : 0.1}
                          strokeWidth={1}
                          style={{
                            filter: isDark
                              ? "drop-shadow(0 6px 16px rgba(0,0,0,0.5))"
                              : "drop-shadow(0 6px 16px rgba(0,0,0,0.1))",
                          }}
                        />

                        {/* Заголовок таймстемпа */}
                        <text
                          x={tipX + 10}
                          y={tipY + 16}
                          fill="currentColor"
                          fillOpacity={0.65}
                          fontSize={10}
                          fontWeight={600}
                        >
                          {activePoint.timestamp}
                        </text>

                        {/* Поступило */}
                        <circle cx={tipX + 12} cy={tipY + 28} r={3} fill={primaryColor} />
                        <text
                          x={tipX + 20}
                          y={tipY + 31}
                          fill="currentColor"
                          fontSize={10}
                          fontWeight={500}
                        >
                          +{activePoint.createdCount}
                        </text>

                        {/* Закрыто */}
                        <circle cx={tipX + 60} cy={tipY + 28} r={3} fill={closedColor} />
                        <text
                          x={tipX + 68}
                          y={tipY + 31}
                          fill="currentColor"
                          fontSize={10}
                          fontWeight={500}
                        >
                          -{activePoint.closedCount}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </Box>
        )}
      </Box>
    </Card>
  );
};