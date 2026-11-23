import React, { useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { useAppTheme } from "~/context/ThemeContext";
import { PRESET_CATALOG, type ThemeDensity, type ThemeMode, type ThemePreset } from "~/theme/palettePresets";

export const ThemeSwitcherMenu: React.FC = () => {
  const {
    preset,
    setPreset,
    customSeed,
    setCustomSeed,
    mode,
    resolvedMode,
    setMode,
    density,
    setDensity,
  } = useAppTheme();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const [customInput, setCustomInput] = useState(customSeed);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCustomApply = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customInput)) {
      setCustomSeed(customInput);
      setPreset("custom");
    }
  };

  const toggleDirectMode = () => {
    setMode(resolvedMode === "dark" ? "light" : "dark");
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      {/* 1. Быстрый переключатель День / Ночь в один клик */}
      <Tooltip title={resolvedMode === "dark" ? "Переключить на светлую тему" : "Переключить на темную тему"} arrow>
        <IconButton
          onClick={toggleDirectMode}
          data-testid="quick-mode-toggle-button"
          size="small"
          sx={{
            p: 1,
            color: "text.secondary",
            bgcolor: resolvedMode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
            "&:hover": {
              bgcolor: resolvedMode === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)",
              color: "primary.main",
            },
          }}
        >
          <M3Icon name={resolvedMode === "dark" ? "light_mode" : "dark_mode"} size={20} />
        </IconButton>
      </Tooltip>

      {/* 2. Кнопка вызова меню палитр M3 и настроек плотности */}
      <Tooltip title="Настройка палитры и оформления (M3)" arrow>
        <IconButton
          onClick={handleOpen}
          data-testid="theme-palette-menu-button"
          size="small"
          sx={{
            p: 1,
            color: isOpen ? "primary.main" : "text.secondary",
            bgcolor: isOpen
              ? "rgba(0, 90, 193, 0.12)"
              : resolvedMode === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.04)",
            "&:hover": {
              bgcolor: "rgba(0, 90, 193, 0.16)",
              color: "primary.main",
            },
          }}
        >
          <M3Icon name="palette" size={20} />
        </IconButton>
      </Tooltip>

      {/* Выпадающая панель оформления */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        data-testid="theme-palette-popover"
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: 340,
              p: 2.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 12px 32px rgba(0, 0, 0, 0.6)"
                  : "0 12px 32px rgba(0, 45, 110, 0.1)",
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Оформление интерфейса (Material 3)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Динамическая генерация тональных поверхностей под ваш комфорт
        </Typography>

        {/* Секция: Тема оформления (День / Ночь / Авто) */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
            Режим темы
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => val && setMode(val as ThemeMode)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          >
            <ToggleButton value="light" data-testid="mode-select-light">
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <M3Icon name="light_mode" size={16} />
                <span>Светлая</span>
              </Stack>
            </ToggleButton>
            <ToggleButton value="dark" data-testid="mode-select-dark">
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <M3Icon name="dark_mode" size={16} />
                <span>Темная</span>
              </Stack>
            </ToggleButton>
            <ToggleButton value="system" data-testid="mode-select-system">
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <M3Icon name="settings_brightness" size={16} />
                <span>Авто</span>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Секция: Выбор палитры */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
            Цветовая палитра
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {(Object.keys(PRESET_CATALOG) as Array<Exclude<ThemePreset, "custom">>).map((pKey) => {
              const meta = PRESET_CATALOG[pKey];
              const isSelected = preset === pKey;
              return (
                <Box
                  key={pKey}
                  onClick={() => setPreset(pKey)}
                  data-testid={`preset-select-${pKey}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.25,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    border: "1.5px solid",
                    borderColor: isSelected ? meta.seed : "transparent",
                    bgcolor: isSelected
                      ? resolvedMode === "dark"
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 90, 193, 0.06)"
                      : "transparent",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: resolvedMode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: meta.seed,
                        boxShadow: `0 2px 6px ${meta.seed}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      {isSelected && <M3Icon name="check" size={16} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500 }}>
                        {meta.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "block" }}>
                        {meta.description.slice(0, 36)}...
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}

            {/* Пользовательский цвет бренда */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: "1.5px solid",
                borderColor: preset === "custom" ? customSeed : "transparent",
                bgcolor: preset === "custom"
                  ? resolvedMode === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 90, 193, 0.06)"
                  : "transparent",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: customSeed,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: preset === "custom" ? 700 : 500 }}>
                  Фирменный цвет компании (Custom)
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TextField
                  size="small"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="#E65100"
                  slotProps={{
                    htmlInput: {
                      "data-testid": "custom-seed-input",
                      style: { fontFamily: "monospace", padding: "4px 8px", fontSize: "0.85rem" },
                    },
                  }}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  onClick={handleCustomApply}
                  data-testid="custom-seed-apply-button"
                  color="primary"
                  size="small"
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                    borderRadius: 1,
                    p: 0.75,
                  }}
                >
                  <M3Icon name="colorize" size={18} />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Секция: Плотность строк (Density) */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
            Плотность интерфейса
          </Typography>
          <ToggleButtonGroup
            value={density}
            exclusive
            onChange={(_, val) => val && setDensity(val as ThemeDensity)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          >
            <ToggleButton value="comfortable" data-testid="density-select-comfortable">
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <M3Icon name="density_medium" size={16} />
                <span>Комфортная</span>
              </Stack>
            </ToggleButton>
            <ToggleButton value="compact" data-testid="density-select-compact">
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <M3Icon name="density_small" size={16} />
                <span>Компактная</span>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Popover>
    </Stack>
  );
};
