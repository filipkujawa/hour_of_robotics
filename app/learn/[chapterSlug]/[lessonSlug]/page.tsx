import { notFound } from "next/navigation";

import { LessonViewer } from "@/components/course/lesson-viewer";
import { getLessonContent } from "@/lib/content";
import { getChapterBySlug } from "@/lib/course-data";
import { renderLessonMdx } from "@/lib/mdx";

export default async function LessonPage({
  params
}: {
  params: { chapterSlug: string; lessonSlug: string };
}) {
  const { chapterSlug, lessonSlug } = params;
  const chapter = getChapterBySlug(chapterSlug);
  const content = await getLessonContent(chapterSlug, lessonSlug);

  if (!chapter || !content) {
    notFound();
  }

  const renderedContent = await renderLessonMdx(content.source);

  return <LessonViewer chapter={chapter} lesson={content.lesson} renderedContent={renderedContent} />;
}
