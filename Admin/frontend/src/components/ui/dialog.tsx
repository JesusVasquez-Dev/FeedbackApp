import React from "react";

export interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogRootProps> = ({ open = false, onOpenChange, children }) => {
  return (
    <div aria-hidden={!open} className={open ? "fixed inset-0 z-50 flex items-center justify-center" : "hidden"}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg ${className}`} {...props} />
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
