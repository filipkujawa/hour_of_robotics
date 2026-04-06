"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, BookOpen, FlaskConical, Code2 } from "lucide-react";

import { LessonCompletion } from "@/components/course/lesson-completion";
import { PretestStep } from "@/components/course/pretest-step";
import { BlocklyWorkspace } from "@/components/exercise/blockly-workspace";
import { MarsConnectExerciseView } from "@/components/exercise/mars-connect-exercise";
import type { Chapter, Lesson, LessonStep } from "@/lib/course-data";
import { chapters } from "@/lib/course-data";
import { useLessonStore } from "@/lib/store/lesson-store";

const allStepsMeta: { id: LessonStep; label: string; icon: typeof BookOpen }[] = [
  { id: "pretest", label: "Pre-test", icon: FlaskConical },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "exercise", label: "Exercise", icon: Code2 },
];

export function LessonViewer({
  chapter,
  lesson,
  renderedContent,
}: {
  chapter: Chapter;
  lesson: Lesson;
  renderedContent: ReactNode;
}) {
  const lessonKey = `${chapter.slug}/${lesson.slug}`;
  const currentStep = useLessonStore((s) => s.currentStep);
  const setLesson = useLessonStore((s) => s.setLesson);
  const setStep = useLessonStore((s) => s.setStep);
  const [completed, setCompleted] = useState(false);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [, startTransition] = useTransition();
  const stepsMeta = lesson.pretest ? allStepsMeta : allStepsMeta.filter((step) => step.id !== "pretest");
  const initialStep = lesson.pretest ? "pretest" : "learn";

  useEffect(() => {
    setLesson(lessonKey, initialStep);
    setCompleted(false);
    setFurthestStepIndex(0);
  }, [initialStep, lessonKey, setLesson]);

  useEffect(() => {
    if (!stepsMeta.some((step) => step.id === currentStep)) {
      setStep(initialStep);
    }
  }, [currentStep, initialStep, setStep, stepsMeta]);

  const flatLessons = useMemo(() => chapters.flatMap((e) => e.lessons), []);
  const lessonIndex = flatLessons.findIndex((e) => e.id === lesson.id);
  const nextLesson = lessonIndex >= 0 ? flatLessons[lessonIndex + 1] ?? null : null;
  const chapterCompleted = nextLesson ? nextLesson.chapterSlug !== lesson.chapterSlug : true;

  if (completed) {
    return <LessonCompletion lesson={lesson} nextLesson={nextLesson} chapterCompleted={chapterCompleted} />;
  }

  if (currentStep === "exercise") {
    if (lesson.exercise.type === "mars-connect") {
      return (
        <MarsConnectExerciseView
          exercise={lesson.exercise}
          onBack={() => setStep("learn")}
          onComplete={() => setCompleted(true)}
        />
      );
    }

    return (
      <BlocklyWorkspace
        exercise={lesson.exercise}
        onBack={() => setStep("learn")}
        onComplete={() => setCompleted(true)}
      />
    );
  }

  const currentStepIndex = Math.max(0, stepsMeta.findIndex((s) => s.id === currentStep));

  return (
    <div className="h-screen w-screen fixed inset-0 z-50 flex flex-col bg-[#f5f5f4] text-[#1a1a19] overflow-hidden">
      {/* ── Top bar ── */}
      <header className="h-11 flex items-center justify-between px-4 bg-white border-b border-[#e2e1de] flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/learn" className="flex items-center gap-1.5 text-[11px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#9c9c9a]">{chapter.title}</span>
            <ChevronLeft className="h-3 w-3 text-[#d4d3d0] rotate-180" />
            <span className="text-[12px] font-semibold text-[#1a1a19] truncate max-w-[240px]">{lesson.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Step tabs */}
          <nav className="flex items-center gap-0.5 bg-[#f0efed] rounded-md p-0.5">
            {stepsMeta.map((step, index) => {
              const active = currentStep === step.id;
              const available = index <= furthestStepIndex;
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => { if (available) setStep(step.id); }}
                  disabled={!available}
                  className={`text-[11px] font-medium px-3 py-1 rounded transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                    active ? "bg-white text-[#1a1a19] shadow-sm" : "text-[#9c9c9a] hover:text-[#6b6b69]"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {step.label}
                </button>
              );
            })}
          </nav>

          <div className="h-4 w-px bg-[#e2e1de]" />

          <span className="text-[10px] text-[#9c9c9a]">
            Step {currentStepIndex + 1} of {stepsMeta.length}
          </span>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {currentStep === "pretest" && lesson.pretest && (
          <PretestStep
            pretest={lesson.pretest}
            onContinue={() => {
              const learnIndex = stepsMeta.findIndex((step) => step.id === "learn");
              setFurthestStepIndex((v) => Math.max(v, learnIndex));
              startTransition(() => setStep("learn"));
            }}
          />
        )}

        {currentStep === "learn" && (
          <div className="flex flex-col h-full">
            {/* Learn content */}
            <div className="flex-1 overflow-y-auto">
              <article className="prose-lesson mx-auto max-w-[780px] px-6 py-8 sm:px-8">
                {renderedContent}
              </article>
            </div>

            {/* Bottom bar */}
            <div className="flex-shrink-0 border-t border-[#e2e1de] bg-white px-6 py-3 flex items-center justify-between">
              {lesson.pretest ? (
                <button
                  onClick={() => setStep("pretest")}
                  className="text-[11px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back to pre-test
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => {
                  const exerciseIndex = stepsMeta.findIndex((step) => step.id === "exercise");
                  setFurthestStepIndex((v) => Math.max(v, exerciseIndex));
                  setStep("exercise");
                }}
                className="text-[12px] font-medium px-4 py-1.5 rounded-md bg-[#1a1a19] text-white hover:bg-[#333] transition-colors"
              >
                Continue to exercise
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
