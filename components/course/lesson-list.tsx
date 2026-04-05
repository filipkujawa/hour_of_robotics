import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

import type { Chapter, Lesson, Role } from "@/lib/course-data";
import type { LessonProgressRecord } from "@/lib/unlocks";
import { chapterCompletion, isLessonCompleted, isLessonUnlocked } from "@/lib/unlocks";
import { formatMinutes } from "@/lib/utils";

export function LessonList({
  chapter,
  progress,
  role,
}: {
  chapter: Chapter;
  progress: LessonProgressRecord[];
  role: Role;
}) {
  const completion = chapterCompletion(chapter, progress);

  return (
    <section className="rounded-xl border border-[#e2e1de] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0efed]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold text-white"
            style={{ backgroundColor: chapter.color }}
          >
            {chapter.number}
          </div>
          <div>
            <div className="text-[10px] text-[#9c9c9a] font-medium">Chapter {chapter.number}</div>
            <h2 className="text-[15px] font-semibold text-[#1a1a19]">{chapter.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#9c9c9a]">
          <span>{completion.completed}/{completion.total} done</span>
          <span>{formatMinutes(chapter.lessons.reduce((t, l) => t + l.estimatedMinutes, 0))}</span>
        </div>
      </div>
      <div className="divide-y divide-[#f5f3ef]">
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
  role,
}: {
  lesson: Lesson;
  progress: LessonProgressRecord[];
  role: Role;
}) {
  const completed = isLessonCompleted(progress, lesson.id);
  const unlocked = isLessonUnlocked(role, lesson, progress);

  const inner = (
    <div className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-[#fafaf9]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] text-[#d4d3d0] font-mono w-6 flex-shrink-0">
          {lesson.chapterNumber}.{lesson.lessonNumber}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#1a1a19] truncate">{lesson.title}</span>
            {completed && <CheckCircle2 className="h-3.5 w-3.5 text-[#d97706] flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-[#9c9c9a] mt-0.5 truncate max-w-lg">{lesson.summary}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[11px] text-[#d4d3d0]">{formatMinutes(lesson.estimatedMinutes)}</span>
        {unlocked && <ChevronRight className="h-3.5 w-3.5 text-[#d4d3d0] group-hover:text-[#9c9c9a] transition" />}
      </div>
    </div>
  );

  return unlocked ? (
    <Link href={`/learn/${lesson.chapterSlug}/${lesson.slug}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
