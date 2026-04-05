"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Pretest } from "@/lib/course-data";

export function PretestStep({
  pretest,
  onContinue
}: {
  pretest: Pretest;
  onContinue: (answerId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function renderQuestionBody() {
    switch (pretest.type) {
      case "multiple-choice":
        return (
          <div className="mt-8 grid gap-4">
            {pretest.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={`rounded-3xl border px-5 py-4 text-left transition ${
                  selected === option.id ? "border-primary bg-tintSoft" : "border-border bg-surface hover:bg-white"
                }`}
              >
                <div className="text-sm font-semibold text-muted">{option.id.toUpperCase()}</div>
                <div className="mt-1 text-base text-text">{option.label}</div>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Card className="mx-auto max-w-4xl p-8 sm:p-10">
      <div className="text-xs uppercase tracking-[0.18em] text-primary">Pre-test</div>
      <h2 className="mt-3 font-display text-4xl tracking-tight text-text">{pretest.question}</h2>
      {renderQuestionBody()}
      {submitted ? (
        <div className="mt-6 rounded-3xl border border-primary/10 bg-tintSoft p-5 text-sm leading-7 text-text">
          <div className="font-semibold text-primary">Recorded</div>
          <p className="mt-2">{pretest.explanation}</p>
          <p className="mt-2 text-muted">
            Pre-tests never block progress. They give students and teachers a baseline before the lesson begins.
          </p>
        </div>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          onClick={() => {
            if (!selected) return;
            setSubmitted(true);
            onContinue(selected);
          }}
          disabled={!selected}
        >
          Record answer
        </Button>
        <Button variant="secondary" onClick={() => onContinue(null)}>
          I&apos;m not sure, just show me
        </Button>
        {submitted ? (
          <Button variant="secondary" onClick={() => onContinue(selected ?? pretest.options[0].id)}>
            Continue to lesson
          </Button>
        ) : null}
      </div>
      {/* TODO: Additional pre-test types plug into this step container later. */}
    </Card>
  );
}
