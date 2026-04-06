import type { HTMLAttributes, ReactNode } from "react";

import { AlertTriangle, Cpu, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

type CalloutType = "concept" | "warning" | "robot-required";

const calloutConfig: Record<
  CalloutType,
  {
    icon: typeof Lightbulb;
    className: string;
  }
> = {
  concept: {
    icon: Lightbulb,
    className: "border-primary/15 bg-tintSoft text-text"
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-950"
  },
  "robot-required": {
    icon: Cpu,
    className: "border-sky-200 bg-sky-50 text-sky-950"
  }
};

export function Callout({
  type = "concept",
  title,
  children
}: {
  type?: CalloutType;
  title: string;
  children: ReactNode;
}) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("lesson-callout rounded-2xl border p-4 shadow-card", config.className)}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="text-sm leading-7 text-current/85">{children}</div>
    </div>
  );
}

export const mdxComponents = {
  Callout,
  h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-display text-4xl tracking-tight text-text sm:text-5xl" {...props} />
  ),
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-10 font-display text-2xl tracking-tight text-text sm:text-3xl" {...props} />
  ),
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 text-lg font-semibold text-text" {...props} />
  ),
  p: (props: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mt-4 text-[1.02rem] leading-8 text-text/88" {...props} />
  ),
  ul: (props: HTMLAttributes<HTMLUListElement>) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[1.02rem] leading-8 text-text/88 marker:text-text/60" {...props} />
  ),
  ol: (props: HTMLAttributes<HTMLOListElement>) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[1.02rem] leading-8 text-text/88 marker:font-medium marker:text-text/60" {...props} />
  ),
  li: (props: HTMLAttributes<HTMLLIElement>) => <li className="pl-1" {...props} />,
  blockquote: (props: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-l-4 border-primary bg-tintSoft/70 px-5 py-3 text-sm italic text-text/80"
      {...props}
    />
  ),
  code: (props: HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-tint px-1.5 py-0.5 font-mono text-[0.9em] text-primary" {...props} />
  ),
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-6 overflow-x-auto rounded-3xl border border-[#2c2542] bg-[#171224] p-5 font-mono text-sm text-white shadow-glow"
      {...props}
    />
  )
};
