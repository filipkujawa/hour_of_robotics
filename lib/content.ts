import { readFile } from "node:fs/promises";
import path from "node:path";

import { getLessonBySlug } from "@/lib/course-data";

function placeholderLessonMdx(title: string) {
  return `# ${title}

Robotics is easiest to learn when each lesson isolates one idea and ties it directly to what the MARS robot can do in the real world. This lesson is a placeholder for the full curriculum and gives you the structure the final content will follow.

<Callout type="concept" title="Core idea">
This lesson will explain one robotics concept, show why it matters on a physical robot, and connect it to a short MARS activity.
</Callout>

## What you will learn

- The main concept behind **${title}**
- How the concept shows up on the MARS robot
- How to reason about it in blocks and Python

## Why it matters

Every robotics system is a chain of sensing, deciding, and acting. This chapter focuses on one part of that chain so you can build a durable mental model before combining everything later.

## Coming soon

This placeholder will be replaced with the full lesson article, diagrams, and media support.

> TODO: Video lesson support plugs into this MDX pipeline later.
`;
}

export async function getLessonContent(chapterSlug: string, lessonSlug: string) {
  const lesson = getLessonBySlug(chapterSlug, lessonSlug);

  if (!lesson) {
    return null;
  }

  if (!lesson.mdxPath) {
    return {
      lesson,
      source: placeholderLessonMdx(lesson.title)
    };
  }

  const filePath = path.join(process.cwd(), lesson.mdxPath);
  const source = await readFile(filePath, "utf8");

  return {
    lesson,
    source
  };
}
