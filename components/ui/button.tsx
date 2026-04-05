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
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#1a1a19] text-white hover:bg-[#333332]",
        variant === "secondary" && "border border-[#e2e1de] bg-white text-[#1a1a19] hover:bg-[#fafaf9]",
        variant === "ghost" && "text-[#6b6b69] hover:bg-[#f5f5f4] hover:text-[#1a1a19]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
