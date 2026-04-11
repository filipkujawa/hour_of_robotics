"use client";

import { create } from "zustand";

import type { LessonStep } from "@/lib/course-data";

interface LessonStoreState {
  currentLessonKey: string | null;
  currentStep: LessonStep;
  workspaceXml: string;
  generatedPython: string;
  setLesson: (lessonKey: string, initialStep?: LessonStep) => void;
  setStep: (step: LessonStep) => void;
  setWorkspaceXml: (xml: string) => void;
  setGeneratedPython: (python: string) => void;
  resetExercise: () => void;
}

export const useLessonStore = create<LessonStoreState>((set) => ({
  currentLessonKey: null,
  currentStep: "learn",
  workspaceXml: "",
  generatedPython: "",
  setLesson: (lessonKey, initialStep = "learn") =>
    set((state) => ({
      currentLessonKey: lessonKey,
      currentStep: state.currentLessonKey === lessonKey ? state.currentStep : initialStep
    })),
  setStep: (step) => set({ currentStep: step }),
  setWorkspaceXml: (workspaceXml) => set({ workspaceXml }),
  setGeneratedPython: (generatedPython) => set({ generatedPython }),
  resetExercise: () => set({ workspaceXml: "", generatedPython: "" })
}));
