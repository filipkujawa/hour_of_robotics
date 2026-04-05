import { ChapterCard } from "@/components/course/chapter-card";
import { ContinueCard } from "@/components/course/continue-card";
import { ProgressStats } from "@/components/course/progress-stats";
import { AppShell } from "@/components/layout/app-shell";
import { chapters, type Role } from "@/lib/course-data";
import { mockProgress } from "@/lib/mock-progress";
import { chapterCompletion, getCurrentLesson, isChapterUnlocked } from "@/lib/unlocks";

export default function DashboardPage() {
  const role: Role = "student";
  const currentLesson = getCurrentLesson(role, mockProgress) ?? chapters[0].lessons[0];
  const lessonsCompleted = mockProgress.filter((entry) => entry.status === "completed").length;
  const totalTimeMinutes = Math.round(mockProgress.reduce((total, entry) => total + (entry.timeSpentSeconds ?? 0), 0) / 60);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 sm:px-8">
        <ContinueCard lesson={currentLesson} progress={0.66} />
        <ProgressStats lessonsCompleted={lessonsCompleted} totalTime={`${totalTimeMinutes} min`} currentChapter="Foundations" />
        <section>
          <div className="mb-5">
            <h2 className="font-display text-4xl tracking-tight text-text">Chapters</h2>
            <p className="mt-2 text-sm leading-7 text-muted">Progress moves sequentially. Teachers can see every lesson immediately.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {chapters.map((chapter) => {
              const completion = chapterCompletion(chapter, mockProgress);
              return (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  completed={completion.completed}
                  total={completion.total}
                  unlocked={isChapterUnlocked(role, chapter, mockProgress)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
