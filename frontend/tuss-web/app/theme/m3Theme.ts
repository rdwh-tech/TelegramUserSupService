import { createTheme } from "@mui/material/styles";

export const m3Theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#005AC1",         // Ключевой синий M3
            light: "#D8E2FF",        // Primary Container
            contrastText: "#FFFFFF", // On Primary
        },
        secondary: {
            main: "#575E71",
            light: "#DBE2F9",
            contrastText: "#FFFFFF",
        },
        error: {
            main: "#BA1A1A",
            light: "#FFDAD6",
            contrastText: "#FFFFFF",
        },
        background: {
            default: "#FDFBFF",      // Surface
            paper: "#F1F4FB",        // Surface Container High
        },
        text: {
            primary: "#1A1B1F",
            secondary: "#44474E",
        },
        divider: "#C4C6D0",
    },
    typography: {
        fontFamily: '"Roboto Flex", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        button: {
            textTransform: "none",   // В M3 у кнопок нет принудительного ALL CAPS
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 16,          // Выразительные скругления Expressive
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 9999,  // Капсульная форма (Pill)
                    padding: "10px 24px",
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    backgroundColor: "#F3F4FA",
                    border: "1px solid rgba(196, 198, 208, 0.4)",
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 28,
                },
            },
        },
    },
});