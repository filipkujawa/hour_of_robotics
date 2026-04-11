import { notFound } from "next/navigation";

import { LessonViewer } from "@/components/course/lesson-viewer";
import { getLessonContent } from "@/lib/content";
import { getAllLessons, getChapterBySlug } from "@/lib/course-data";
import { renderLessonMdx } from "@/lib/mdx";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLessons().map((lesson) => ({
    chapterSlug: lesson.chapterSlug,
    lessonSlug: lesson.slug
  }));
}

export default async function LessonPage({
  params
}: {
  params: Promise<{ chapterSlug: string; lessonSlug: string }>;
}) {
  const { chapterSlug, lessonSlug } = await params;
  const chapter = getChapterBySlug(chapterSlug);
  const content = await getLessonContent(chapterSlug, lessonSlug);

  if (!chapter || !content) {
    notFound();
  }

  const renderedContent = await renderLessonMdx(content.source);

  return <LessonViewer chapter={chapter} lesson={content.lesson} renderedContent={renderedContent} />;
}
