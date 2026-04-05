"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Lesson } from "@/lib/course-data";

export function LessonCompletion({
  lesson,
  nextLesson,
  chapterCompleted
}: {
  lesson: Lesson;
  nextLesson: Lesson | null;
  chapterCompleted: boolean;
}) {
  return (
    <div className="space-y-6">
      {chapterCompleted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-primary/15 bg-tintSoft px-6 py-5"
        >
          <div className="text-sm font-semibold text-primary">Chapter complete</div>
          <p className="mt-2 text-sm leading-7 text-text">
            You finished this chapter. The next chapter unlocks now and is ready when you are.
          </p>
        </motion.div>
      ) : null}
      <Card className="mx-auto max-w-3xl p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-primary/10 bg-tintSoft">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" className="overflow-visible">
            <motion.circle
              cx="12"
              cy="12"
              r="10"
              stroke="#c4b5fd"
              strokeWidth="1.5"
              initial={{ scale: 0.92, opacity: 0.35 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 0.55 }}
            />
            <motion.path
              d="M7 12.5L10.2 15.7L17.3 8.6"
              stroke="#5b21b6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="22"
              initial={{ strokeDashoffset: 22 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          </svg>
        </div>
        <h2 className="mt-6 font-display text-4xl tracking-tight text-text">Lesson complete</h2>
        <p className="mt-4 text-base leading-8 text-muted">
          {lesson.title} is finished. Your pre-test answer and Blockly work are ready to save into persistent progress once Supabase is connected.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {nextLesson ? (
            <Link href={`/learn/${nextLesson.chapterSlug}/${nextLesson.slug}`}>
              <Button>Next lesson</Button>
            </Link>
          ) : (
            <Link href="/learn">
              <Button>Back to course</Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="secondary">Exit to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
