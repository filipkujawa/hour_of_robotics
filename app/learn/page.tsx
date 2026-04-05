import { LessonList } from "@/components/course/lesson-list";
import { AppShell } from "@/components/layout/app-shell";
import { chapters, type Role } from "@/lib/course-data";
import { mockProgress } from "@/lib/mock-progress";

export default function LearnPage() {
  const role: Role = "student";

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10 sm:px-8">
        <div className="max-w-3xl">
          <div className="text-sm uppercase tracking-[0.2em] text-primary">Course overview</div>
          <h1 className="mt-3 font-display text-5xl tracking-tight text-text">The complete robotics path</h1>
          <p className="mt-4 text-base leading-8 text-muted">
            Every chapter is expanded here so students and teachers can see the full structure, lesson timing, and unlock state at a glance.
          </p>
        </div>
        {chapters.map((chapter) => (
          <LessonList key={chapter.id} chapter={chapter} progress={mockProgress} role={role} />
        ))}
      </div>
    </AppShell>
  );
}
