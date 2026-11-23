import React from "react";
import { Button, type ButtonProps, CircularProgress } from "@mui/material";

export interface M3ButtonProps extends ButtonProps {
    isLoading?: boolean;
    loading?: boolean;
    to?: string;
}

export const M3Button: React.FC<M3ButtonProps> = ({
    isLoading = false,
    loading = false,
    disabled,
    children,
    startIcon,
    ...props
}) => {
    const isBusy = isLoading || loading;
    return (
        <Button
            {...props}
            disabled={disabled || isBusy}
            startIcon={
                isBusy ? (
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
