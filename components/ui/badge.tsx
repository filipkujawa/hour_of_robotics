import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#e2e1de] bg-[#fafaf9] px-2 py-0.5 text-[11px] font-medium text-[#6b6b69]",
        className,
      )}
      {...props}
    />
  );
}
