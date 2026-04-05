"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import { LessonCompletion } from "@/components/course/lesson-completion";
import { PretestStep } from "@/components/course/pretest-step";
import { BlocklyWorkspace } from "@/components/exercise/blockly-workspace";
import { Button } from "@/components/ui/button";
import type { Chapter, Lesson, LessonStep } from "@/lib/course-data";
import { chapters } from "@/lib/course-data";
import { useLessonStore } from "@/lib/store/lesson-store";

const steps: { id: LessonStep; label: string }[] = [
  { id: "pretest", label: "Pre-test" },
  { id: "learn", label: "Learn" },
  { id: "exercise", label: "Exercise" }
];

export function LessonViewer({
  chapter,
  lesson,
  renderedContent
}: {
  chapter: Chapter;
  lesson: Lesson;
  renderedContent: ReactNode;
}) {
  const lessonKey = `${chapter.slug}/${lesson.slug}`;
  const currentStep = useLessonStore((state) => state.currentStep);
  const setLesson = useLessonStore((state) => state.setLesson);
  const setStep = useLessonStore((state) => state.setStep);
  const [completed, setCompleted] = useState(false);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLesson(lessonKey);
    setFurthestStepIndex(0);
  }, [lessonKey, setLesson]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && currentStep !== "pretest") {
        setStep("pretest");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentStep, setStep]);

  const flatLessons = useMemo(() => chapters.flatMap((entry) => entry.lessons), []);
  const lessonIndex = flatLessons.findIndex((entry) => entry.id === lesson.id);
  const nextLesson = lessonIndex >= 0 ? flatLessons[lessonIndex + 1] ?? null : null;
  const chapterCompleted = nextLesson ? nextLesson.chapterSlug !== lesson.chapterSlug : true;

  if (completed) {
    return <LessonCompletion lesson={lesson} nextLesson={nextLesson} chapterCompleted={chapterCompleted} />;
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6">
      <div className="mb-3 flex flex-col gap-2 border-b border-border/70 pb-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted sm:text-sm">
            <Link href="/learn" className="transition hover:text-text">
              Course
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{chapter.title}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-text">{lesson.title}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl tracking-tight text-text sm:text-3xl">{lesson.title}</h1>
        </div>
        <Link href="/dashboard" className="shrink-0 text-sm text-muted transition hover:text-text">
          Exit to dashboard
        </Link>
      </div>

      <div className="mb-4 overflow-x-auto border-b border-border/70 pb-3">
        <div className="flex min-w-max gap-2">
          {steps.map((step, index) => {
            const active = currentStep === step.id;
            const completedStep = steps.findIndex((entry) => entry.id === currentStep) > index;
            const available = index <= furthestStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (available) {
                    setStep(step.id);
                  }
                }}
                className={`group flex min-w-[180px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                  active ? "border-primary/20 bg-tintSoft" : "border-border/70 bg-white hover:bg-surface"
                }`}
                disabled={!available}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
                  <motion.div
                    layout={false}
                    initial={false}
                    animate={{
                      opacity: active || completedStep ? 1 : 0,
                      scale: active ? 1 : 0.92
                    }}
                    className="absolute inset-0 rounded-full bg-tintSoft"
                  />
                  <span className="relative z-10 grid h-full place-items-center text-xs font-medium text-text">{index + 1}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-none text-text">{step.label}</div>
                  <div className="mt-1 text-[11px] leading-none text-muted">
                    {completedStep ? "Complete" : active ? "In progress" : available ? "Available" : "Complete the previous step first"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div key={currentStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        {currentStep === "pretest" ? (
          <PretestStep
            pretest={lesson.pretest}
            onContinue={() => {
              setFurthestStepIndex((value) => Math.max(value, 1));
              startTransition(() => setStep("learn"));
            }}
          />
        ) : null}

        {currentStep === "learn" ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Learn</div>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Focus on the lesson content first, then continue to the exercise when you are ready to apply it.
                </p>
              </div>
              <Button
                onClick={() => {
                  setFurthestStepIndex((value) => Math.max(value, 2));
                  setStep("exercise");
                }}
              >
                Continue to exercise
              </Button>
            </div>
            <article className="prose-lesson mx-auto max-w-[920px] px-1 py-2 sm:px-2">
              {renderedContent}
            </article>
          </div>
        ) : null}

        {currentStep === "exercise" ? (
          <BlocklyWorkspace
            exercise={lesson.exercise}
            onComplete={() => {
              setCompleted(true);
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
