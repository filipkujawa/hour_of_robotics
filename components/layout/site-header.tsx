"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/learn" className="transition hover:text-text">
            Curriculum
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/learn">
            <Button>Start Learning</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
