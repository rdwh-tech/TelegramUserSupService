import React from "react";

interface M3IconProps {
    name: string;
    filled?: boolean;
    className?: string;
    size?: number;
}

export const M3Icon: React.FC<M3IconProps> = ({
                                                  name,
                                                  filled = false,
                                                  className = "",
                                                  size = 24,
                                              }) => {
    return (
        <span
            className={`material-symbols-rounded ${className}`}
            style={{
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
                fontSize: `${size}px`,
                verticalAlign: "middle",
                display: "inline-block",
            }}
        >
      {name}
    </span>
    );
};