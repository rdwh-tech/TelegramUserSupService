// app/components/tickets/ActiveTicketBanner.tsx
import React from "react";
import { Link } from "react-router";
import { Box, Paper, Typography, Stack } from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import type { Ticket } from "~/types/ticket";

export interface ActiveTicketBannerProps {
  activeTicket: Ticket;
}

export const ActiveTicketBanner: React.FC<ActiveTicketBannerProps> = ({ activeTicket }) => {
  return (
    <Paper
      elevation={0}
      data-testid="active-ticket-banner"
      sx={{
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 4,
        bgcolor: "#FFF8E1",
        border: "1px solid #FFE08A",
        color: "#523600",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        boxShadow: "0 2px 8px rgba(154, 107, 0, 0.08)",
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: "#FFEBA7",
            color: "#9A6B00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <M3Icon name="lock" size={24} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#7A4E00" }}>
            Правило «В одни руки» активно
          </Typography>
          <Typography variant="body2" sx={{ color: "#523600", mt: 0.25 }}>
            У вас уже есть открытое обращение <strong>#{activeTicket.ticketNumber}</strong> (
            {activeTicket.client.fullName}). Завершите или передайте его перед взятием нового.
          </Typography>
        </Box>
      </Stack>

      <M3Button
        variant="contained"
        component={Link}
        to="/tickets/active"
        sx={{
          bgcolor: "#9A6B00",
          color: "#FFFFFF",
          whiteSpace: "nowrap",
          alignSelf: { xs: "stretch", sm: "auto" },
          "&:hover": {
            bgcolor: "#7A4E00",
          },
        }}
        startIcon={<M3Icon name="chat" size={18} />}
      >
        Перейти к активному тикету
      </M3Button>
    </Paper>
  );
};
