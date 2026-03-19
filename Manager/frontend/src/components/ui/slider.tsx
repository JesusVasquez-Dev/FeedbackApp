import React from "react";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value?: string | number;
  onValueChange?: (val: number[]) => void;
}

export const Slider: React.FC<SliderProps> = ({ value = 0, onValueChange, className = "", ...props }) => {
  const v = typeof value === "number" ? value : Number(value);

  const min = typeof props.min === "number" ? props.min : Number(props.min ?? 0);
  const max = typeof props.max === "number" ? props.max : Number(props.max ?? 100);
  const clampedMax = Number.isFinite(max) ? max : 100;
  const clampedMin = Number.isFinite(min) ? min : 0;
  const range = Math.max(1, clampedMax - clampedMin);
  const pct = Math.max(0, Math.min(100, ((v - clampedMin) / range) * 100));

  const mergedStyle: React.CSSProperties = {
    ...(props.style as React.CSSProperties | undefined),
    background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${pct}%, rgb(226, 232, 240) ${pct}%, rgb(226, 232, 240) 100%)`,
  };

  return (
    <input
      type="range"
      className={`w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent
      [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full
      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-1.5
      [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
      [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:shadow-sm
      ${className}`}
      value={v}
      style={mergedStyle}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  );
};
