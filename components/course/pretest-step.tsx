"use client";

import { useState } from "react";
import type { Pretest } from "@/lib/course-data";

export function PretestStep({
  pretest,
  onContinue,
}: {
  pretest: Pretest;
  onContinue: (answerId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex items-start justify-center py-12 px-6">
      <div className="w-full max-w-[640px]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d97706]">
          Pre-test
        </div>
        <h2 className="mt-3 text-[22px] font-bold text-[#1a1a19] leading-snug tracking-tight">
          {pretest.question}
        </h2>

        {pretest.type === "multiple-choice" && (
          <div className="mt-6 space-y-2">
            {pretest.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                  selected === option.id
                    ? "border-[#d97706] bg-[#fef8f0]"
                    : "border-[#e2e1de] bg-white hover:bg-[#fafaf9]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selected === option.id
                        ? "border-[#d97706]"
                        : "border-[#d4d3d0]"
                    }`}
                  >
                    {selected === option.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-[#9c9c9a] uppercase">
                      {option.id}
                    </div>
                    <div className="text-[13px] text-[#1a1a19] mt-0.5">
                      {option.label}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {submitted && (
          <div className="mt-5 rounded-lg border border-[#e2e1de] bg-[#fafaf9] p-4">
            <div className="text-[11px] font-semibold text-[#d97706]">Recorded</div>
            <p className="mt-1.5 text-[12px] text-[#6b6b69] leading-relaxed">
              {pretest.explanation}
            </p>
            <p className="mt-2 text-[11px] text-[#9c9c9a]">
              Pre-tests never block progress. They give a baseline before the lesson begins.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={() => {
              if (!selected) return;
              setSubmitted(true);
              onContinue(selected);
            }}
            disabled={!selected}
            className="text-[12px] font-medium px-4 py-2 rounded-md bg-[#1a1a19] text-white hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Record answer
          </button>
          <button
            onClick={() => onContinue(null)}
            className="text-[12px] font-medium px-4 py-2 rounded-md border border-[#e2e1de] text-[#6b6b69] hover:bg-[#fafaf9] transition-colors"
          >
            Skip
          </button>
          {submitted && (
            <button
              onClick={() => onContinue(selected ?? pretest.options[0].id)}
              className="text-[12px] font-medium px-4 py-2 rounded-md bg-[#1a1a19] text-white hover:bg-[#333] transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
