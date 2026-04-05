import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Lesson } from "@/lib/course-data";

export function ContinueCard({ lesson, progress }: { lesson: Lesson; progress: number }) {
  return (
    <Card className="overflow-hidden p-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="inline-flex rounded-full border border-primary/10 bg-tintSoft px-3 py-1 text-xs font-medium text-primary">
            Continue learning
          </div>
          <h1 className="mt-5 max-w-2xl font-display text-4xl tracking-tight text-text">{lesson.title}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-muted">{lesson.summary}</p>
          <div className="mt-8">
            <Link href={`/learn/${lesson.chapterSlug}/${lesson.slug}`}>
              <Button className="gap-2">
                Resume lesson
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="rounded-[28px] border border-border bg-surface p-6">
          <div className="text-sm text-muted">Progress through current lesson</div>
          <div className="mt-4 text-4xl font-semibold tracking-tight text-text">{Math.round(progress * 100)}%</div>
          <div className="mt-6 h-3 rounded-full bg-white">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted">
            <div className="flex justify-between">
              <span>Pre-test</span>
              <span>Done</span>
            </div>
            <div className="flex justify-between">
              <span>Learn</span>
              <span>{progress > 0.34 ? "Done" : "Up next"}</span>
            </div>
            <div className="flex justify-between">
              <span>Exercise</span>
              <span>{progress >= 1 ? "Done" : "Waiting"}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
