import type { ProgressStatus, Role } from "@/lib/course-data";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}

export interface LessonProgressRow {
  id: string;
  user_id: string;
  lesson_id: string;
  step: "pretest" | "learn" | "exercise";
  status: ProgressStatus;
  pretest_answer: string | null;
  exercise_code_xml: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
}
