import { NextResponse } from "next/server";

import type { LessonStep, ProgressStatus } from "@/lib/course-data";

interface ProgressPayload {
  lessonId: string;
  step: LessonStep;
  status: ProgressStatus;
  exerciseCodeXml?: string | null;
  timeSpentSeconds?: number;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProgressPayload;

  if (!payload.lessonId || !payload.step || !payload.status) {
    return NextResponse.json({ error: "Missing required progress fields." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    saved: {
      ...payload,
      completedAt: payload.status === "completed" ? new Date().toISOString() : null
    }
  });
}
