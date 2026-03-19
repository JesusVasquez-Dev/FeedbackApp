export type ToastOptions = { title?: string; description?: string; variant?: "default" | "destructive" };

export type ToastItem = ToastOptions & { id: string };

export function useToast() {
  return { toast, toasts: [] as ToastItem[] };
}

export function toast(opts: ToastOptions) {
  if (opts.variant === "destructive") {
    console.error(`Toast: ${opts.title || ""} ${opts.description || ""}`);
  } else {
    console.log(`Toast: ${opts.title || ""} ${opts.description || ""}`);
  }
}
