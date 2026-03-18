export type ToastOptions = { title?: string; description?: string; variant?: "default" | "destructive" };

export function useToast() {
  function toast(opts: ToastOptions) {
    if (opts.variant === "destructive") {
      console.error(`Toast: ${opts.title || ""} ${opts.description || ""}`);
    } else {
      console.log(`Toast: ${opts.title || ""} ${opts.description || ""}`);
    }
  }
  return { toast };
}
