import { createTheme, type Theme } from "@mui/material/styles";
import {
  PRESET_CATALOG,
  hexToHsl,
  hslToHex,
  type ThemeDensity,
  type ThemeMode,
  type ThemePreset,
} from "./palettePresets";

export interface BuildThemeOptions {
  preset?: ThemePreset;
  customSeed?: string;
  mode?: "light" | "dark";
  density?: ThemeDensity;
}

export function buildM3Theme(options: BuildThemeOptions = {}): Theme {
  const {
    preset = "telegram",
    customSeed = "#0077D6",
    mode = "light",
    density = "comfortable",
  } = options;

  const isDark = mode === "dark";

  // 1. Определение цветовых параметров
  let primaryMain: string;
  let primaryLight: string;
  let primaryDark: string;
  let primaryContrastText = "#FFFFFF";

  let secondaryMain: string;
  let secondaryLight: string;
  let secondaryContrastText = "#FFFFFF";

  let bgDefault: string;
  let bgPaper: string;
  let surfaceContainer: string;
  let textPrimary: string;
  let textSecondary: string;
  let dividerColor: string;

  if (preset !== "custom" && PRESET_CATALOG[preset]) {
    const pMeta = PRESET_CATALOG[preset];
    const { h, s } = hexToHsl(pMeta.seed);

    if (!isDark) {
      primaryMain = pMeta.primaryLight;
      primaryLight = hslToHex(h, Math.min(s, 60), 92);
      primaryDark = hslToHex(h, s, 32);

      secondaryMain = hslToHex(h, 16, 42);
      secondaryLight = hslToHex(h, 24, 91);

      bgDefault = hslToHex(h, 18, 98.2);
      bgPaper = "#FFFFFF";
      surfaceContainer = pMeta.surfaceContainerLight;
      textPrimary = "#191C1E";
      textSecondary = "#43474E";
      dividerColor = "rgba(196, 198, 208, 0.4)";
    } else {
      primaryMain = pMeta.primaryDark;
      primaryLight = hslToHex(h, s, 28);
      primaryDark = hslToHex(h, s, 18);
      primaryContrastText =
        preset === "pine"
          ? "#003826"
          : preset === "nordic"
          ? "#053350"
          : preset === "berry"
          ? "#441c42"
          : "#002E69";

      secondaryMain = hslToHex(h, 18, 76);
      secondaryLight = hslToHex(h, 20, 26);

      bgDefault = hslToHex(h, 14, 9);
      bgPaper = hslToHex(h, 12, 13);
      surfaceContainer = pMeta.surfaceContainerDark;
      textPrimary = "#E2E2E6";
      textSecondary = "#A8ACB4";
      dividerColor = "rgba(142, 145, 155, 0.2)";
    }
  } else {
    // Пользовательский цвет бренда (Custom Seed)
    const validSeed = /^#[0-9A-Fa-f]{6}$/.test(customSeed) ? customSeed : "#0077D6";
    const { h, s } = hexToHsl(validSeed);

    if (!isDark) {
      primaryMain = hslToHex(h, Math.max(s, 40), 40);
      primaryLight = hslToHex(h, Math.min(s, 60), 92);
      primaryDark = hslToHex(h, s, 28);

      secondaryMain = hslToHex(h, 16, 42);
      secondaryLight = hslToHex(h, 24, 91);

      bgDefault = hslToHex(h, 16, 98.2);
      bgPaper = "#FFFFFF";
      surfaceContainer = hslToHex(h, 24, 95);
      textPrimary = "#191C1E";
      textSecondary = "#43474E";
      dividerColor = "rgba(196, 198, 208, 0.4)";
    } else {
      primaryMain = hslToHex(h, Math.max(s, 45), 76);
      primaryLight = hslToHex(h, s, 28);
      primaryDark = hslToHex(h, s, 18);
      primaryContrastText = hslToHex(h, s, 14);

      secondaryMain = hslToHex(h, 18, 76);
      secondaryLight = hslToHex(h, 20, 26);

      bgDefault = hslToHex(h, 14, 9);
      bgPaper = hslToHex(h, 12, 13);
      surfaceContainer = hslToHex(h, 16, 17);
      textPrimary = "#E2E2E6";
      textSecondary = "#A8ACB4";
      dividerColor = "rgba(142, 145, 155, 0.2)";
    }
  }

  // 2. Параметры плотности интерфейса (Density)
  const isCompact = density === "compact";
  const tableCellPadding = isCompact ? "8px 12px" : "14px 16px";
  const buttonPadding = isCompact ? "6px 18px" : "9px 22px";
  const buttonFontSize = isCompact ? "0.875rem" : "0.9375rem";

  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: primaryContrastText,
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        contrastText: secondaryContrastText,
      },
      error: {
        main: isDark ? "#FFB4AB" : "#BA1A1A",
        light: isDark ? "rgba(255, 180, 171, 0.16)" : "#FFDAD6",
        dark: isDark ? "#FF5449" : "#93000A",
        contrastText: isDark ? "#410002" : "#FFFFFF",
      },
      warning: {
        main: isDark ? "#FFBA28" : "#9A6B00",
        light: isDark ? "rgba(255, 186, 40, 0.16)" : "#FFF8E1",
        dark: isDark ? "#FFD088" : "#7A4E00",
        contrastText: isDark ? "#2A1800" : "#FFFFFF",
      },
      success: {
        main: isDark ? "#7BD78D" : "#1E6C30",
        light: isDark ? "rgba(123, 215, 141, 0.16)" : "#E8F5E9",
        dark: isDark ? "#9EF2AE" : "#00531E",
        contrastText: isDark ? "#003913" : "#FFFFFF",
      },
      info: {
        main: isDark ? "#7BD0FF" : "#006399",
        light: isDark ? "rgba(123, 208, 255, 0.16)" : "#E7F0FF",
        dark: isDark ? "#A6DCFF" : "#004B76",
        contrastText: isDark ? "#003453" : "#FFFFFF",
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: dividerColor,
    },
    typography: {
      fontFamily: '"Roboto Flex", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 9999,
            padding: buttonPadding,
            fontSize: buttonFontSize,
            fontWeight: 600,
            transition: "all 0.15s ease-in-out",
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? bgPaper : "#FFFFFF",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: isDark
              ? "0 2px 8px rgba(0, 0, 0, 0.35)"
              : "0 1px 4px rgba(0, 0, 0, 0.03)",
            transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 12,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundColor: bgPaper,
            boxShadow: isDark
              ? "0 16px 40px rgba(0, 0, 0, 0.6)"
              : "0 16px 40px rgba(0, 0, 0, 0.12)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: tableCellPadding,
            borderColor: dividerColor,
          },
          head: {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : surfaceContainer,
            color: textSecondary,
            fontWeight: 700,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            borderRadius: 10,
            border: "1px solid",
            fontSize: "0.875rem",
            ...(ownerState.severity === "error" && {
              backgroundColor: isDark ? "rgba(255, 180, 171, 0.14)" : "#FFDAD6",
              color: isDark ? "#FFB4AB" : "#410002",
              borderColor: isDark ? "rgba(255, 180, 171, 0.3)" : "rgba(186, 26, 26, 0.2)",
              "& .MuiAlert-icon": {
                color: isDark ? "#FFB4AB" : "#BA1A1A",
              },
            }),
            ...(ownerState.severity === "warning" && {
              backgroundColor: isDark ? "rgba(255, 186, 40, 0.14)" : "#FFF8E1",
              color: isDark ? "#FFBA28" : "#523600",
              borderColor: isDark ? "rgba(255, 186, 40, 0.3)" : "rgba(154, 107, 0, 0.2)",
              "& .MuiAlert-icon": {
                color: isDark ? "#FFBA28" : "#9A6B00",
              },
            }),
            ...(ownerState.severity === "success" && {
              backgroundColor: isDark ? "rgba(123, 215, 141, 0.14)" : "#E8F5E9",
              color: isDark ? "#7BD78D" : "#0F5132",
              borderColor: isDark ? "rgba(123, 215, 141, 0.3)" : "rgba(30, 108, 48, 0.2)",
              "& .MuiAlert-icon": {
                color: isDark ? "#7BD78D" : "#1E6C30",
              },
            }),
            ...(ownerState.severity === "info" && {
              backgroundColor: isDark ? "rgba(123, 208, 255, 0.14)" : "#E7F0FF",
              color: isDark ? "#7BD0FF" : "#003453",
              borderColor: isDark ? "rgba(123, 208, 255, 0.3)" : "rgba(0, 99, 153, 0.2)",
              "& .MuiAlert-icon": {
                color: isDark ? "#7BD0FF" : "#006399",
              },
            }),
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.18)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryMain,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryMain,
            },
          },
        },
      },
    },
  });
}

// Экспорт темы по умолчанию для обратной совместимости
export const m3Theme = buildM3Theme();
