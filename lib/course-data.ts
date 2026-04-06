export type Role = "student" | "teacher";
export type LessonStep = "pretest" | "learn" | "exercise";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type PretestType = "multiple-choice";
export type ExerciseType = "blockly" | "mars-connect";

export interface PretestOption {
  id: string;
  label: string;
}

export interface Pretest {
  type: PretestType;
  question: string;
  options: PretestOption[];
  correctOptionId: string;
  explanation: string;
}

interface ExerciseBase {
  title: string;
  prompt: string;
  successCriteria: string[];
  hints: string[];
}

export interface BlocklyExercise extends ExerciseBase {
  type: "blockly";
  initialXml?: string;
}

export interface MarsConnectExercise extends ExerciseBase {
  type: "mars-connect";
  actionLabel: string;
  celebrationMessage: string;
}

export type Exercise = BlocklyExercise | MarsConnectExercise;

export interface Lesson {
  id: string;
  slug: string;
  chapterSlug: string;
  chapterNumber: number;
  lessonNumber: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  mdxPath?: string;
  pretest?: Pretest;
  exercise: Exercise;
}

export interface Chapter {
  id: string;
  slug: string;
  number: number;
  title: string;
  description: string;
  color: string;
  lessons: Lesson[];
}

const chapterPalette = [
  "#7c3aed",
  "#2563eb",
  "#0f766e",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#16a34a"
] as const;

type ChapterSeed = {
  slug: string;
  title: string;
  description: string;
  lessons: string[];
};

const chapterSeeds: ChapterSeed[] = [
  {
    slug: "foundations",
    title: "Foundations",
    description: "Build the mental model for what a robot is and how MARS turns skills into action.",
    lessons: ["Connecting to the MARS Robot", "What is a Robot?", "Your First Skill Call"]
  },
  {
    slug: "sensing",
    title: "Sensing",
    description: "See how MARS understands the world with vision, depth, sound, and multiple sensors at once.",
    lessons: ["Camera & Detection", "Stereo Depth", "LiDAR", "Gripper Camera", "Sound & Speech", "Sensor Fusion"]
  },
  {
    slug: "acting",
    title: "Acting",
    description: "Go from perception to movement, navigation, and manipulation with the MARS arm and base.",
    lessons: ["Navigation 101", "Obstacle Avoidance", "The Arm", "Inverse Kinematics", "Teach by Demonstration", "Grasping"]
  },
  {
    slug: "maps-and-slam",
    title: "Maps & SLAM",
    description: "Learn how robots build maps, locate themselves, and remember the spaces they move through.",
    lessons: ["What is a Map", "SLAM", "Localization", "Path Planning", "Spatial Memory"]
  },
  {
    slug: "deciding",
    title: "Deciding",
    description: "Model robot behavior with state, rules, language prompts, and practical failure handling.",
    lessons: ["State Machines", "Condition-Action Rules", "Language as Controller", "Multi-Skill Behaviors", "When Robots Fail"]
  },
  {
    slug: "ai-and-learning",
    title: "AI & Learning",
    description: "Connect robotics to modern AI systems, from perception models to on-device inference.",
    lessons: ["How Robots See", "Training from Demos", "Vision-Language-Action Models", "Edge AI", "Generalization"]
  },
  {
    slug: "capstone",
    title: "Capstone",
    description: "Design, build, debug, and present a complete MARS project that demonstrates autonomous behavior.",
    lessons: ["Define Your Project", "Build & Train", "Debug & Iterate", "Demo Day"]
  }
];

function makeStubPretest(title: string): Pretest {
  return {
    type: "multiple-choice",
    question: `Which statement best describes the focus of "${title}"?`,
    options: [
      { id: "a", label: "It teaches one robotics idea and connects it to MARS." },
      { id: "b", label: "It is only a hardware assembly checklist." },
      { id: "c", label: "It skips robotics concepts and jumps straight to code syntax." },
      { id: "d", label: "It is just a history lesson about industrial robots." }
    ],
    correctOptionId: "a",
    explanation: "Each lesson is structured around one core robotics idea and how that idea appears on the MARS platform."
  };
}

function makeStubExercise(title: string): Exercise {
  return {
    type: "blockly",
    title: `Practice: ${title}`,
    prompt: `Use MARS blocks to explore the key concept from ${title}. The live robot connection is coming soon, so focus on building the right sequence and reading the generated Python.`,
    successCriteria: [
      "Build a short block sequence related to the lesson concept.",
      "Inspect the Python translation to connect blocks to code.",
      "Save your progress so you can continue later."
    ],
    hints: [
      "Start with a simple sequence, then add logic or timing.",
      "Use the reference panel when you want to understand a block before placing it.",
      "Compare your blocks to the Python output to see how the structure maps."
    ]
  };
}

export const chapters: Chapter[] = chapterSeeds.map((chapterSeed, chapterIndex) => {
  const chapterNumber = chapterIndex + 1;

  const lessons = chapterSeed.lessons.map((lessonTitle, lessonIndex) => {
    const lessonSlug = lessonTitle
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return {
      id: `${chapterSeed.slug}-${lessonSlug}`,
      slug: lessonSlug,
      chapterSlug: chapterSeed.slug,
      chapterNumber,
      lessonNumber: lessonIndex + 1,
      title: lessonTitle,
      summary: `A focused lesson on ${lessonTitle.toLowerCase()} using the Innate MARS robot.`,
      estimatedMinutes: chapterNumber === 1 && lessonIndex === 0 ? 10 : 12,
      pretest: makeStubPretest(lessonTitle),
      exercise: makeStubExercise(lessonTitle)
    } satisfies Lesson;
  });

  return {
    id: chapterSeed.slug,
    slug: chapterSeed.slug,
    number: chapterNumber,
    title: chapterSeed.title,
    description: chapterSeed.description,
    color: chapterPalette[chapterIndex],
    lessons
  } satisfies Chapter;
});

const chapterOneLessonOne = chapters[0].lessons[0];
chapterOneLessonOne.summary =
  "Get MARS powered on, on the right network, and ready for its first live connection from the course workspace.";
chapterOneLessonOne.mdxPath = "content/lessons/foundations-connecting-to-the-mars-robot.mdx";
chapterOneLessonOne.pretest = undefined;
chapterOneLessonOne.exercise = {
  type: "mars-connect",
  title: "Connect to MARS",
  prompt:
    "Power on MARS, connect from the course, then trigger a quick hello-and-spin check to confirm the robot is responding.",
  successCriteria: [
    "Connect successfully to the MARS robot.",
    "Use the action button to make MARS say hi and spin in place.",
  ],
  hints: [
    "Wait for the robot to finish booting before opening the connect dialog.",
    "Use the default robot URL unless your instructor gave you a different one.",
    "If connection fails, recheck Wi-Fi and make sure the ROS bridge is reachable.",
  ],
  actionLabel: "Say Hi and Spin",
  celebrationMessage: "MARS responded. The robot is connected and ready for the rest of chapter 1.",
};

const chapterOneLessonTwo = chapters[0].lessons[1];
chapterOneLessonTwo.summary =
  "Understand what makes a machine a robot: sensing, deciding, and acting in the physical world.";
chapterOneLessonTwo.mdxPath = "content/lessons/foundations-what-is-a-robot.mdx";
chapterOneLessonTwo.pretest = {
  type: "multiple-choice",
  question: "Which description best captures what makes a system a robot?",
  options: [
    { id: "a", label: "Any machine that moves on its own, even if it cannot sense anything." },
    { id: "b", label: "A physical system that can sense, decide, and act in the world." },
    { id: "c", label: "Any computer program that follows instructions." },
    { id: "d", label: "A remote-controlled machine with no onboard decision making." }
  ],
  correctOptionId: "b",
  explanation:
    "Robots combine sensing, computation, and physical action. Movement alone is not enough, and remote control alone is not autonomy."
};
chapterOneLessonTwo.exercise = {
  type: "blockly",
  title: "Meet MARS",
  prompt:
    'Program MARS to greet the room, then roll forward half a meter. Build a sequence that first says "Hello!" and then moves forward 0.5 meters.',
  successCriteria: [
    'Your blocks make MARS say "Hello!" exactly once.',
    "Your sequence moves MARS forward by 0.5 meters after speaking.",
    "The Python panel updates to show the same logic in code."
  ],
  hints: [
    'Start with the Speech category and add a `say` block with the text "Hello!".',
    "Use a Movement block after speech so the order is explicit.",
    "If the generated Python looks reversed, reorder the blocks in the workspace."
  ],
  initialXml:
    '<xml xmlns="https://developers.google.com/blockly/xml"><block type="mars_say" x="28" y="32"><field name="TEXT">Hello!</field><next><block type="mars_move_forward"><field name="DISTANCE">0.5</field></block></next></block></xml>'
};

const chapterOneLessonThree = chapters[0].lessons[2];
chapterOneLessonThree.mdxPath = "content/lessons/foundations-your-first-skill-call.mdx";

export const chapterMap = new Map(chapters.map((chapter) => [chapter.slug, chapter]));
export const lessonMap = new Map(
  chapters.flatMap((chapter) => chapter.lessons.map((lesson) => [`${chapter.slug}/${lesson.slug}`, lesson] as const))
);

export function getChapterBySlug(slug: string) {
  return chapterMap.get(slug);
}

export function getLessonBySlug(chapterSlug: string, lessonSlug: string) {
  return lessonMap.get(`${chapterSlug}/${lessonSlug}`);
}

export function getAllLessons() {
  return chapters.flatMap((chapter) => chapter.lessons);
}
