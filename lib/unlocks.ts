import type { Chapter, Lesson, ProgressStatus, Role } from "@/lib/course-data";
import { chapters } from "@/lib/course-data";

export interface LessonProgressRecord {
  lessonId: string;
  status: ProgressStatus;
  step: "pretest" | "learn" | "exercise";
  completedAt?: string | null;
  timeSpentSeconds?: number | null;
}

export function isLessonCompleted(progress: LessonProgressRecord[] | undefined, lessonId: string) {
  return progress?.some((entry) => entry.lessonId === lessonId && entry.status === "completed") ?? false;
}

export function isLessonUnlocked(
  role: Role,
  lesson: Lesson,
  progress: LessonProgressRecord[] | undefined
) {
  if (role === "teacher") {
    return true;
  }

  const chapter = chapters.find((item) => item.slug === lesson.chapterSlug);
  if (!chapter) {
    return false;
  }

  if (chapter.number === 1 && lesson.lessonNumber === 1) {
    return true;
  }

  if (lesson.lessonNumber > 1) {
    const previousLesson = chapter.lessons[lesson.lessonNumber - 2];
    return isLessonCompleted(progress, previousLesson.id);
  }

  const previousChapter = chapters[chapter.number - 2];
  return previousChapter.lessons.every((entry) => isLessonCompleted(progress, entry.id));
}

export function isChapterUnlocked(role: Role, chapter: Chapter, progress: LessonProgressRecord[] | undefined) {
  if (role === "teacher" || chapter.number === 1) {
    return true;
  }

  const previousChapter = chapters[chapter.number - 2];
  return previousChapter.lessons.every((entry) => isLessonCompleted(progress, entry.id));
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
