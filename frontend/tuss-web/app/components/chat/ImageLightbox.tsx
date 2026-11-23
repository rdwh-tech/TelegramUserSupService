// app/components/chat/ImageLightbox.tsx
import React from "react";
import { Dialog, DialogContent, Box, IconButton, Typography } from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";

export interface ImageLightboxProps {
  open: boolean;
  imageUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open,
  imageUrl,
  fileName,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "hidden",
            borderRadius: 2,
          },
        },
      }}
    >
      <Box sx={{ position: "relative", bgcolor: "rgba(0, 0, 0, 0.9)", p: 1.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, px: 1 }}>
          <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
            {fileName || "Изображение"}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "#FFFFFF", p: 0.5 }} size="small">
            <M3Icon name="close" size={20} />
          </IconButton>
        </Box>

        <Box
          component="img"
          src={imageUrl}
          alt={fileName || "Просмотр вложения"}
          sx={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            objectFit: "contain",
            borderRadius: 1.5,
            display: "block",
            mx: "auto",
          }}
        />
      </Box>
    </Dialog>
  );
};
