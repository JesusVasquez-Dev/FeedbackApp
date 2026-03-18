import React, { createContext, useContext, useState } from "react";

type RadioCtxT = { value?: string; setValue: (v: string) => void };
const RadioCtx = createContext<RadioCtxT | null>(null);

export const RadioGroup: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }>
  = ({ value: controlled, onValueChange, children }) => {
  const [value, setValue] = useState(controlled);
  const set = (v: string) => { setValue(v); onValueChange?.(v); };
  return <RadioCtx.Provider value={{ value, setValue: set }}><div className="grid gap-2">{children}</div></RadioCtx.Provider>;
};

export const RadioGroupItem: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => {
  const ctx = useContext(RadioCtx)!;
  const checked = ctx.value === props.value;
  return (
    <input
      type="radio"
      checked={checked}
      onChange={() => ctx.setValue(String(props.value))}
      className={`h-4 w-4 rounded-full border border-input text-primary focus:ring-2 focus:ring-ring ${className}`}
      {...props}
    />
  );
};
