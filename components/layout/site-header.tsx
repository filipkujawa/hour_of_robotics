"use client";

import Link from "next/link";

import { useAuthSession } from "@/components/auth/use-auth-session";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function SiteHeader() {
  const { hasSession } = useAuthSession();
  const loginHref = hasSession ? "/dashboard" : "/login";
  const primaryHref = hasSession ? "/dashboard" : "/signup";

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/learn" className="transition hover:text-text">
            Curriculum
          </Link>
          <Link href="/dashboard" className="transition hover:text-text">
            Dashboard
          </Link>
          <Link href="/settings" className="transition hover:text-text">
            Settings
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href={loginHref} className="text-sm text-muted transition hover:text-text">
            Log in
          </Link>
          <Link href={primaryHref}>
            <Button>Start Learning</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
