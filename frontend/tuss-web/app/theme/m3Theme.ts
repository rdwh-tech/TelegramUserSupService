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
        main: isDark ? "#F87171" : "#DC2626",
        light: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2",
        dark: isDark ? "#EF4444" : "#991B1B",
        contrastText: "#FFFFFF",
      },
      warning: {
        main: isDark ? "#FBBF24" : "#D97706",
        light: isDark ? "rgba(245, 158, 11, 0.2)" : "#FFFBEB",
        dark: isDark ? "#F59E0B" : "#92400E",
        contrastText: "#FFFFFF",
      },
      success: {
        main: isDark ? "#4ADE80" : "#16A34A",
        light: isDark ? "rgba(34, 197, 94, 0.2)" : "#F0FDF4",
        dark: isDark ? "#22C55E" : "#166534",
        contrastText: "#FFFFFF",
      },
      info: {
        main: isDark ? "#60A5FA" : "#2563EB",
        light: isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF",
        dark: isDark ? "#3B82F6" : "#1E40AF",
        contrastText: "#FFFFFF",
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
          root: ({ ownerState }) => {
            const isError = ownerState.severity === "error";
            const isWarning = ownerState.severity === "warning";
            const isSuccess = ownerState.severity === "success";
            const isInfo = ownerState.severity === "info";

            let bg = isDark ? "rgba(239, 68, 68, 0.18)" : "#FEF2F2";
            let text = isDark ? "#FFE4E1" : "#991B1B";
            let border = isDark ? "rgba(248, 113, 113, 0.55)" : "#FCA5A5";
            let icon = isDark ? "#F87171" : "#DC2626";

            if (isWarning) {
              bg = isDark ? "rgba(245, 158, 11, 0.18)" : "#FFFBEB";
              text = isDark ? "#FEF3C7" : "#92400E";
              border = isDark ? "rgba(251, 191, 36, 0.55)" : "#FCD34D";
              icon = isDark ? "#FBBF24" : "#D97706";
            } else if (isSuccess) {
              bg = isDark ? "rgba(34, 197, 94, 0.18)" : "#F0FDF4";
              text = isDark ? "#DCFCE7" : "#166534";
              border = isDark ? "rgba(74, 222, 128, 0.55)" : "#86EFAC";
              icon = isDark ? "#4ADE80" : "#16A34A";
            } else if (isInfo) {
              bg = isDark ? "rgba(59, 130, 246, 0.18)" : "#EFF6FF";
              text = isDark ? "#DBEAFE" : "#1E40AF";
              border = isDark ? "rgba(96, 165, 250, 0.55)" : "#93C5FD";
              icon = isDark ? "#60A5FA" : "#2563EB";
            }

            return {
              borderRadius: 10,
              border: `1px solid ${border}`,
              backgroundColor: bg,
              color: text,
              fontSize: "0.875rem",
              boxShadow: isDark
                ? "0 4px 12px rgba(0, 0, 0, 0.35)"
                : "0 1px 3px rgba(0, 0, 0, 0.05)",
              "& .MuiAlert-message": {
                color: text,
                fontWeight: 600,
              },
              "& .MuiAlert-icon": {
                color: icon,
              },
            };
          },
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
