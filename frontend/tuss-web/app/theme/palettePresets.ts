export type ThemePreset = "telegram" | "pine" | "nordic" | "berry" | "custom";
export type ThemeMode = "light" | "dark" | "system";
export type ThemeDensity = "comfortable" | "compact";

export interface PresetMeta {
  id: ThemePreset;
  name: string;
  description: string;
  seed: string;
  primaryLight: string;
  primaryDark: string;
  surfaceContainerLight: string;
  surfaceContainerDark: string;
}

export const PRESET_CATALOG: Record<Exclude<ThemePreset, "custom">, PresetMeta> = {
  telegram: {
    id: "telegram",
    name: "Telegram Classic",
    description: "Насыщенный кобальт в стиле нативного Telegram Desktop",
    seed: "#0077D6",
    primaryLight: "#005AC1",
    primaryDark: "#ADC6FF",
    surfaceContainerLight: "#F0F4FC",
    surfaceContainerDark: "#1E232B",
  },
  pine: {
    id: "pine",
    name: "Pine & Sage",
    description: "Успокаивающий хвойно-изумрудный тон, снижающий нагрузку на зрение",
    seed: "#16694E",
    primaryLight: "#16694E",
    primaryDark: "#9DD4B7",
    surfaceContainerLight: "#EDF5F0",
    surfaceContainerDark: "#1C2420",
  },
  nordic: {
    id: "nordic",
    name: "Nordic Slate",
    description: "Сдержанный графитово-стальной тон терминалов и современных IDE",
    seed: "#3E5F7A",
    primaryLight: "#3E5F7A",
    primaryDark: "#A7C9EB",
    surfaceContainerLight: "#EFF2F6",
    surfaceContainerDark: "#1F2328",
  },
  berry: {
    id: "berry",
    name: "Berry Dusk",
    description: "Благородный сливово-индиговый акцент без кричащего неона",
    seed: "#764E74",
    primaryLight: "#764E74",
    primaryDark: "#E7B3E3",
    surfaceContainerLight: "#F5EEF4",
    surfaceContainerDark: "#241D23",
  },
};

// Простой и надежный генератор палитры от любого HEX (Custom Seed)
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hexVal = Math.round((n + m) * 255).toString(16);
    return hexVal.length === 1 ? "0" + hexVal : hexVal;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
