import React from "react";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string | number;
  onValueChange?: (val: number[]) => void;
}

export const Slider: React.FC<SliderProps> = ({ value = 0, onValueChange, className = "", ...props }) => {
  const v = typeof value === "number" ? value : Number(value);
  return (
    <input
      type="range"
      className={`w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer ${className}`}
      value={v}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  );
};
