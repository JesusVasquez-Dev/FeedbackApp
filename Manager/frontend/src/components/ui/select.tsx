import React, { createContext, useContext, useState } from "react";

type Ctx = {
  value?: string;
  label?: string;
  placeholder?: string;
  setValue: (v?: string, l?: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const SelectCtx = createContext<Ctx | null>(null);

export const Select: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }>
  = ({ value: controlled, onValueChange, children }) => {
  const [value, setValueState] = useState<string | undefined>(controlled);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const setValue = (v?: string, l?: string) => {
    setValueState(v);
    setLabel(l);
    onValueChange?.(v ?? "");
    setOpen(false);
  };

  return (
    <SelectCtx.Provider value={{ value, label, placeholder: undefined, setValue, open, setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectCtx.Provider>
  );
};

export const SelectTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ${className}`}
      {...props}
    />
  );
};

export const SelectValue: React.FC<{ placeholder?: string; className?: string }>
  = ({ placeholder = "Select...", className = "" }) => {
  const ctx = useContext(SelectCtx)!;
  return <span className={className}>{ctx.label ?? placeholder}</span>;
};

export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => {
  const ctx = useContext(SelectCtx)!;
  if (!ctx.open) return null;
  return (
    <div className={`absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md ${className}`} {...props} />
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode; className?: string }>
  = ({ value, children, className = "" }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <div
      role="option"
      onClick={() => ctx.setValue(value, String(children))}
      className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      {children}
    </div>
  );
};
