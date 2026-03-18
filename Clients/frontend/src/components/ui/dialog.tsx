import React, { createContext, useContext } from "react";

export interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

type DialogCtxValue = { open: boolean; setOpen: (v: boolean) => void };
const DialogCtx = createContext<DialogCtxValue | null>(null);

export const Dialog: React.FC<DialogRootProps> = ({ open = false, onOpenChange, children }) => {
  const setOpen = (v: boolean) => onOpenChange?.(v);
  return (
    <DialogCtx.Provider value={{ open, setOpen }}>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
        </div>
      )}
      {children}
    </DialogCtx.Provider>
  );
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  (() => {
    const ctx = useContext(DialogCtx);
    if (!ctx?.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className={`relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto ${className}`}
          {...props}
        />
      </div>
    );
  })()
);

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mb-4 ${className}`} {...props} />
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
);

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = "", ...props }) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement; onOpen?: () => void }>
  = ({ children }) => {
  const ctx = useContext(DialogCtx);
  return React.cloneElement(children, {
    ...children.props,
    onClick: (e: any) => {
      children.props?.onClick?.(e);
      ctx?.setOpen(true);
    },
  });
};

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mt-6 flex items-center justify-end gap-2 ${className}`} {...props} />
);
