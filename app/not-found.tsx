import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <Card className="max-w-xl p-10 text-center">
        <div className="text-sm uppercase tracking-[0.2em] text-primary">404</div>
        <h1 className="mt-3 font-display text-5xl tracking-tight text-text">Lesson not found</h1>
        <p className="mt-4 text-base leading-8 text-muted">
          The route exists in neither the published course nor the draft content set. Head back to the curriculum and choose a valid lesson.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/learn">
            <Button>Back to course</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
