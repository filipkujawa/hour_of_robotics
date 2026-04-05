import Link from "next/link";
import { CheckCircle2, ChevronRight, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Chapter, Lesson, Role } from "@/lib/course-data";
import type { LessonProgressRecord } from "@/lib/unlocks";
import { chapterCompletion, isLessonCompleted, isLessonUnlocked } from "@/lib/unlocks";
import { formatMinutes } from "@/lib/utils";

export function LessonList({
  chapter,
  progress,
  role
}: {
  chapter: Chapter;
  progress: LessonProgressRecord[];
  role: Role;
}) {
  const completion = chapterCompletion(chapter, progress);

  return (
    <section className="rounded-[32px] border border-border bg-white p-6 shadow-card">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-11 w-11 rounded-2xl"
            style={{ backgroundColor: `${chapter.color}20`, boxShadow: `inset 0 0 0 1px ${chapter.color}25` }}
          />
          <div>
            <div className="text-sm text-muted">Chapter {chapter.number}</div>
            <h2 className="font-display text-3xl tracking-tight text-text">{chapter.title}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge>{completion.completed}/{completion.total} complete</Badge>
          <Badge>{formatMinutes(chapter.lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0))}</Badge>
        </div>
      </div>
      <div className="divide-y divide-border/70">
        {chapter.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} progress={progress} role={role} />
        ))}
      </div>
    </section>
  );
}

function LessonRow({
  lesson,
  progress,
  role
}: {
  lesson: Lesson;
  progress: LessonProgressRecord[];
  role: Role;
}) {
  const completed = isLessonCompleted(progress, lesson.id);
  const unlocked = isLessonUnlocked(role, lesson, progress);
  const content = (
    <div className="group flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted">{lesson.chapterNumber}.{lesson.lessonNumber}</div>
          <h3 className="text-lg font-medium text-text">{lesson.title}</h3>
          {completed ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : !unlocked ? (
            <LockKeyhole className="h-4 w-4 text-muted" />
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{lesson.summary}</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Badge>{formatMinutes(lesson.estimatedMinutes)}</Badge>
        <span className="inline-flex items-center gap-1 text-muted">
          {completed ? "Complete" : unlocked ? "Open lesson" : "Locked"}
          {unlocked ? <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
        </span>
      </div>
    </div>
  );

  return unlocked ? (
    <Link href={`/learn/${lesson.chapterSlug}/${lesson.slug}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
