import React from "react";

const variants: Record<string, string> = {
  default: "bg-muted text-foreground",
  outline: "border border-input",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "default", className = "", ...props }) => {
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${variants[variant]} ${className}`} {...props} />;
};
