import React from "react";

export const Progress: React.FC<{ value?: number; className?: string }>
  = ({ value = 0, className = "" }) => (
  <div className={`w-full h-2 bg-muted rounded-full overflow-hidden ${className}`}>
    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);
