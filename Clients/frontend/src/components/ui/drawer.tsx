import React, { createContext, useContext } from "react";

type DrawerCtxValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DrawerCtx = createContext<DrawerCtxValue | null>(null);

export interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open = false, onOpenChange, children }) => {
  const setOpen = (v: boolean) => onOpenChange?.(v);
  return (
    <DrawerCtx.Provider value={{ open, setOpen }}>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
        </div>
      )}
      {children}
    </DrawerCtx.Provider>
  );
};

export const DrawerTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement }> = ({ children }) => {
  const ctx = useContext(DrawerCtx);
  return React.cloneElement(children, {
    ...children.props,
    onClick: (e: any) => {
      children.props?.onClick?.(e);
      ctx?.setOpen(true);
    },
  });
};

export const DrawerClose: React.FC<{ asChild?: boolean; children: React.ReactElement }> = ({ children }) => {
  const ctx = useContext(DrawerCtx);
  return React.cloneElement(children, {
    ...children.props,
    onClick: (e: any) => {
      children.props?.onClick?.(e);
      ctx?.setOpen(false);
    },
  });
};

export const DrawerContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) =>
  (() => {
    const ctx = useContext(DrawerCtx);
    if (!ctx?.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div
          className={`relative z-50 w-full max-w-2xl rounded-t-lg border bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto ${className}`}
          {...props}
        />
      </div>
    );
  })();

export const DrawerHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mb-4 ${className}`} {...props} />
);

export const DrawerTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
);

export const DrawerDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = "", ...props }) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);

export const DrawerFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`mt-6 flex items-center justify-end gap-2 ${className}`} {...props} />
);
