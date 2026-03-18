import React, { createContext, useContext } from "react";

interface SheetContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SheetCtx = createContext<SheetContextValue>({ open: false });

export const Sheet: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
  = ({ open = false, onOpenChange, children }) => {
  return <SheetCtx.Provider value={{ open, onOpenChange }}>{children}</SheetCtx.Provider>;
};

export const SheetTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement }>
  = ({ children }) => {
  const { onOpenChange } = useContext(SheetCtx);
  return React.cloneElement(children, { onClick: () => onOpenChange?.(true) });
};

export const SheetContent: React.FC<{ side?: "left" | "right" | "top" | "bottom"; className?: string; children: React.ReactNode }>
  = ({ side = "right", className = "", children }) => {
  const { open, onOpenChange } = useContext(SheetCtx);
  if (!open) return null;
  const sideClass = side === "left" ? "left-0" : side === "right" ? "right-0" : side === "top" ? "top-0" : "bottom-0";
  const axis = side === "left" || side === "right" ? "h-full w-80" : "w-full h-64";
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className={`absolute ${sideClass} bg-background border ${axis} p-4 shadow-xl ${className}`}>{children}</div>
    </div>
  );
};
