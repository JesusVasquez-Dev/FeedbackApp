import React from "react";
import { createPortal } from "react-dom";

export interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogRootProps> = ({ open = false, onOpenChange, children }) => {
  if (!open) return null;
  return createPortal(
    <div aria-hidden={!open} className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>,
    document.body
  );
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-2xl ${className}`} {...props} />
);

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mb-4 ${className}`} {...props} />
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
);

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement; onOpen?: () => void }>
  = ({ children }) => {
  return React.cloneElement(children, { ...children.props });
};

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mt-6 flex items-center justify-end gap-2 ${className}`} {...props} />
);
