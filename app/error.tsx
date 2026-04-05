"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <Card className="max-w-xl p-10">
        <div className="text-sm uppercase tracking-[0.2em] text-primary">Something broke</div>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-text">The course view failed to load.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">{error.message}</p>
        <div className="mt-8 flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
