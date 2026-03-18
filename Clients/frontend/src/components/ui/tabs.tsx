import * as React from "react";

type TabsCtxValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsCtx = React.createContext<TabsCtxValue | null>(null);

export const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode; className?: string }> = ({
  defaultValue,
  children,
}) => {
  const [value, setValue] = React.useState(defaultValue);
  return <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>;
};

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`} {...props} />
);

export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({
  value,
  children,
  className = "",
}) => {
  const ctx = React.useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all disabled:pointer-events-none disabled:opacity-50 ${
        active ? "bg-background text-foreground shadow-sm" : ""
      } ${className}`}
      onClick={() => ctx?.setValue(value)}
      aria-pressed={active}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({
  value,
  children,
  className = "",
}) => {
  const ctx = React.useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
};
