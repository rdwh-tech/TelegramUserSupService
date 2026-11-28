import { describe, it, expect } from "vitest";
import { buildM3Theme } from "./m3Theme";
import { PRESET_CATALOG, hexToHsl } from "./palettePresets";

// Расчет относительной яркости (Relative Luminance) по стандарту W3C WCAG 2.1
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const rgb = [
    parseInt(cleanHex.substring(0, 2), 16) / 255,
    parseInt(cleanHex.substring(2, 4), 16) / 255,
    parseInt(cleanHex.substring(4, 6), 16) / 255,
  ].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// Расчет коэффициента контрастности (Contrast Ratio) по WCAG
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Material 3 Theme & Button Contrast (m3Theme)", () => {
  it("berry preset in dark mode does not blend button with background on hover", () => {
    const theme = buildM3Theme({ preset: "berry", mode: "dark" });

    const primaryMain = theme.palette.primary.main;
    const primaryDark = theme.palette.primary.dark;
    const contrastText = theme.palette.primary.contrastText;
    const bgPaper = theme.palette.background.paper;

    // primary.main должна быть пастельно-светлой (#E7B3E3)
    expect(primaryMain.toLowerCase()).toBe("#e7b3e3");
    // primary.dark (состояние hover) НЕ должна быть почти черной (L >= 60%)
    const darkHsl = hexToHsl(primaryDark);
    expect(darkHsl.l).toBeGreaterThanOrEqual(60);

    // Контраст текста на кнопке в обычном состоянии (WCAG AAA >= 7:1)
    const normalContrast = getContrastRatio(primaryMain, contrastText);
    expect(normalContrast).toBeGreaterThanOrEqual(7.0);

    // Контраст текста на кнопке при hover (WCAG AAA/AA >= 5.5:1)
    const hoverContrast = getContrastRatio(primaryDark, contrastText);
    expect(hoverContrast).toBeGreaterThanOrEqual(5.5);

    // Контраст кнопки hover относительно фона карточки bgPaper (кнопка НЕ сливается с фоном)
    const paperVsButtonHoverContrast = getContrastRatio(primaryDark, bgPaper);
    expect(paperVsButtonHoverContrast).toBeGreaterThanOrEqual(4.5);
  });

  it("all presets in dark mode maintain high contrast and visible hover state", () => {
    const presets: Array<keyof typeof PRESET_CATALOG> = [
      "telegram",
      "pine",
      "nordic",
      "berry",
    ];

    presets.forEach((preset) => {
      const theme = buildM3Theme({ preset, mode: "dark" });
      const primaryMain = theme.palette.primary.main;
      const primaryDark = theme.palette.primary.dark;
      const contrastText = theme.palette.primary.contrastText;
      const bgPaper = theme.palette.background.paper;

      // Кнопка в режиме hover должна иметь читаемый контраст с текстом
      const hoverContrast = getContrastRatio(primaryDark, contrastText);
      expect(
        hoverContrast,
        `Preset ${preset} hover contrast is too low: ${hoverContrast}`
      ).toBeGreaterThanOrEqual(4.5);

      // Кнопка в режиме hover не должна сливаться с фоном карточки
      const cardContrast = getContrastRatio(primaryDark, bgPaper);
      expect(
        cardContrast,
        `Preset ${preset} button hover blends with card: ${cardContrast}`
      ).toBeGreaterThanOrEqual(4.0);
    });
  });

  it("custom seed in dark mode calculates visible hover state and contrast", () => {
    const theme = buildM3Theme({ preset: "custom", customSeed: "#9C27B0", mode: "dark" });
    const primaryDark = theme.palette.primary.dark;
    const contrastText = theme.palette.primary.contrastText;
    const bgPaper = theme.palette.background.paper;

    const hoverContrast = getContrastRatio(primaryDark, contrastText);
    expect(hoverContrast).toBeGreaterThanOrEqual(4.5);

    const cardContrast = getContrastRatio(primaryDark, bgPaper);
    expect(cardContrast).toBeGreaterThanOrEqual(4.0);
  });

  it("light mode maintains white contrastText and darker hover state", () => {
    const theme = buildM3Theme({ preset: "telegram", mode: "light" });
    expect(theme.palette.primary.contrastText).toBe("#FFFFFF");

    const hoverContrast = getContrastRatio(theme.palette.primary.dark, "#FFFFFF");
    expect(hoverContrast).toBeGreaterThanOrEqual(4.5);
  });
});
