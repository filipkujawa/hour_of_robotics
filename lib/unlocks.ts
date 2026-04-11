import type { Chapter, Lesson, ProgressStatus, Role } from "@/lib/course-data";
import { chapters } from "@/lib/course-data";

export interface LessonProgressRecord {
  lessonId: string;
  status: ProgressStatus;
  step: "learn" | "exercise";
  completedAt?: string | null;
  timeSpentSeconds?: number | null;
}

export function isLessonCompleted(progress: LessonProgressRecord[] | undefined, lessonId: string) {
  return progress?.some((entry) => entry.lessonId === lessonId && entry.status === "completed") ?? false;
}

export function isLessonUnlocked(
  _role: Role,
  _lesson: Lesson,
  _progress: LessonProgressRecord[] | undefined
) {
  // All lessons unlocked — no account required
  return true;
}

export function isChapterUnlocked(_role: Role, _chapter: Chapter, _progress: LessonProgressRecord[] | undefined) {
  // All chapters unlocked — no account required
  return true;
}

export function chapterCompletion(chapter: Chapter, progress: LessonProgressRecord[] | undefined) {
  const completed = chapter.lessons.filter((lesson) => isLessonCompleted(progress, lesson.id)).length;
  return {
    completed,
    total: chapter.lessons.length,
    ratio: chapter.lessons.length ? completed / chapter.lessons.length : 0
  };
}

export function getCurrentLesson(role: Role, progress: LessonProgressRecord[] | undefined) {
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      if (isLessonUnlocked(role, lesson, progress) && !isLessonCompleted(progress, lesson.id)) {
        return lesson;
      }
    }
  }

  return chapters.at(-1)?.lessons.at(-1) ?? null;
}
