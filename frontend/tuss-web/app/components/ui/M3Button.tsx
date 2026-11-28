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
    onClick,
    ...props
}) => {
    const isBusy = isLoading || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isBusy || disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick?.(e);
    };

    return (
        <Button
            {...props}
            onClick={handleClick}
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
