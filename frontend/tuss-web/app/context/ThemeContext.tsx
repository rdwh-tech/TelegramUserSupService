import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline, type Theme } from "@mui/material";
import { buildM3Theme } from "~/theme/m3Theme";
import type { ThemeDensity, ThemeMode, ThemePreset } from "~/theme/palettePresets";

export interface ThemeContextValue {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  customSeed: string;
  setCustomSeed: (seed: string) => void;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  density: ThemeDensity;
  setDensity: (density: ThemeDensity) => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const PRESET_KEY = "tuss_theme_preset";
const SEED_KEY = "tuss_theme_custom_seed";
const MODE_KEY = "tuss_theme_mode";
const DENSITY_KEY = "tuss_theme_density";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. Инициализация из localStorage с безопасной проверкой SSR
  const [preset, setPresetState] = useState<ThemePreset>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PRESET_KEY) as ThemePreset;
      if (stored && ["telegram", "pine", "nordic", "berry", "custom"].includes(stored)) {
        return stored;
      }
    }
    return "telegram";
  });

  const [customSeed, setCustomSeedState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SEED_KEY);
      if (stored && /^#[0-9A-Fa-f]{6}$/.test(stored)) {
        return stored;
      }
    }
    return "#0077D6";
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(MODE_KEY) as ThemeMode;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        return stored;
      }
    }
    return "light";
  });

  const [density, setDensityState] = useState<ThemeDensity>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DENSITY_KEY) as ThemeDensity;
      if (stored && ["comfortable", "compact"].includes(stored)) {
        return stored;
      }
    }
    return "comfortable";
  });

  // 2. Определение системной темы при mode === "system"
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const resolvedMode: "light" | "dark" = mode === "system" ? (systemIsDark ? "dark" : "light") : mode;

  // 3. Сохранение изменений в localStorage
  const setPreset = (val: ThemePreset) => {
    setPresetState(val);
    if (typeof window !== "undefined") localStorage.setItem(PRESET_KEY, val);
  };

  const setCustomSeed = (val: string) => {
    setCustomSeedState(val);
    if (typeof window !== "undefined") localStorage.setItem(SEED_KEY, val);
  };

  const setMode = (val: ThemeMode) => {
    setModeState(val);
    if (typeof window !== "undefined") localStorage.setItem(MODE_KEY, val);
  };

  const setDensity = (val: ThemeDensity) => {
    setDensityState(val);
    if (typeof window !== "undefined") localStorage.setItem(DENSITY_KEY, val);
  };

  // 4. Построение MUI Theme при изменении параметров
  const theme = useMemo(() => {
    return buildM3Theme({
      preset,
      customSeed,
      mode: resolvedMode,
      density,
    });
  }, [preset, customSeed, resolvedMode, density]);

  const contextValue: ThemeContextValue = {
    preset,
    setPreset,
    customSeed,
    setCustomSeed,
    mode,
    resolvedMode,
    setMode,
    density,
    setDensity,
    theme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return context;
}
