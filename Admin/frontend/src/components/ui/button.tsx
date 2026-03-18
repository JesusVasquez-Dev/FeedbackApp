import React from "react";

const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  ghost: "bg-transparent hover:bg-muted",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
};
const sizes: Record<string, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-12 px-6",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button: React.FC<ButtonProps> = ({ variant = "default", size = "md", className = "", ...props }) => {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};
