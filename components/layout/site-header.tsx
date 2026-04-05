"use client";

import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e2e1de] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo />
        <nav className="flex items-center gap-4">
          <Link href="/learn" className="text-[12px] text-[#6b6b69] hover:text-[#1a1a19] transition">
            Curriculum
          </Link>
          <Link
            href="/learn"
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-md bg-[#1a1a19] text-white hover:bg-[#333332] transition"
          >
            Start Learning
          </Link>
        </nav>
      </div>
    </header>
  );
}
