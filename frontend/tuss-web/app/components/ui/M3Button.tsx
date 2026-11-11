import React from "react";
import { Button, type ButtonProps, CircularProgress } from "@mui/material";

interface M3ButtonProps extends ButtonProps {
    isLoading?: boolean;
}

export const M3Button: React.FC<M3ButtonProps> = ({
                                                      isLoading = false,
                                                      disabled,
                                                      children,
                                                      startIcon,
                                                      ...props
                                                  }) => {
    return (
        <Button
            {...props}
            disabled={disabled || isLoading}
            startIcon={
                isLoading ? (
                    <CircularProgress size={18} color="inherit" thickness={5} />
                ) : (
                    startIcon
                )
            }
        >
            {children}
        </Button>
    );
};