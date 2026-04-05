import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Chapter } from "@/lib/course-data";
import { cn, formatMinutes } from "@/lib/utils";

export function ChapterCard({
  chapter,
  completed,
  total,
  unlocked
}: {
  chapter: Chapter;
  completed: number;
  total: number;
  unlocked: boolean;
}) {
  const content = (
    <Card className="group h-full p-6 transition duration-200 hover:-translate-y-1">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Chapter {chapter.number}</p>
          <h3 className="mt-2 font-display text-2xl tracking-tight text-text">{chapter.title}</h3>
        </div>
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: chapter.color, boxShadow: `0 0 0 8px ${chapter.color}1A` }}
        />
      </div>
      <p className="text-sm leading-7 text-muted">{chapter.description}</p>
      <div className="mt-6 flex items-center gap-2">
        <Badge>{completed}/{total} complete</Badge>
        <Badge>{formatMinutes(total * 12)}</Badge>
      </div>
      <div className="mt-6 h-2 rounded-full bg-surface">
        <div className="h-full rounded-full transition-all" style={{ width: `${(completed / total) * 100}%`, backgroundColor: chapter.color }} />
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className={cn("font-medium", unlocked ? "text-text" : "text-muted")}>
          {unlocked ? "Open chapter" : "Locked"}
        </span>
        {unlocked ? <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" /> : <LockKeyhole className="h-4 w-4 text-muted" />}
      </div>
    </Card>
  );

  if (!unlocked) {
    return content;
  }

  const firstLesson = chapter.lessons[0];
  return (
    <Link href={`/learn/${chapter.slug}/${firstLesson.slug}`} className="block h-full">
      {content}
    </Link>
  );
}
