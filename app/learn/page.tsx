import { LessonList } from "@/components/course/lesson-list";
import { AppShell } from "@/components/layout/app-shell";
import { chapters, type Role } from "@/lib/course-data";
import { mockProgress } from "@/lib/mock-progress";

export default function LearnPage() {
  const role: Role = "teacher";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 px-6 py-10">
        <div className="max-w-2xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97706]">
            Curriculum
          </div>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-[#1a1a19]">
            The complete robotics path
          </h1>
          <p className="mt-2 text-[13px] text-[#6b6b69] leading-7">
            7 chapters taking students from &quot;what is a robot&quot; to building autonomous behaviors.
          </p>
        </div>
        {chapters.map((chapter) => (
          <LessonList key={chapter.id} chapter={chapter} progress={mockProgress} role={role} />
        ))}
      </div>
    </AppShell>
  );
}
