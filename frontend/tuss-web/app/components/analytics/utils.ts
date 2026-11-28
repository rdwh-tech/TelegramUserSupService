// app/components/analytics/utils.ts

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return "Нет данных";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} с`;
  }

  const mins = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);

  if (mins < 60) {
    return remainingSecs > 0 ? `${mins} мин ${remainingSecs} с` : `${mins} мин`;
  }

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours} ч ${remainingMins} мин` : `${hours} ч`;
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Нет данных";
  }
  return `${value.toFixed(1)}%`;
}

export function formatCSAT(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return "Нет данных";
  }
  return rating.toFixed(2);
}
