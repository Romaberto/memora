import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-emerald-600 focus-visible:ring-accent shadow-sm",
  secondary:
    "bg-slate-800 text-white hover:bg-slate-700",
  ghost:
    "bg-transparent hover:bg-black/5 text-[rgb(var(--foreground))]",
  outline:
    "border border-[rgb(var(--border))] bg-transparent hover:bg-black/[0.03] hover:border-[rgb(var(--foreground))]/20",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
>(function Button({ className = "", variant = "primary", disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background))] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  );
});
