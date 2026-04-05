import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-primary text-white shadow-glow hover:-translate-y-0.5 hover:bg-primary/95",
        variant === "secondary" && "border border-border bg-white text-text hover:-translate-y-0.5 hover:bg-surface",
        variant === "ghost" && "text-muted hover:bg-tintSoft hover:text-text",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
