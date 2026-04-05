import { BookOpen, Clock3, Layers3 } from "lucide-react";

import { Card } from "@/components/ui/card";

export function ProgressStats({
  lessonsCompleted,
  totalTime,
  currentChapter
}: {
  lessonsCompleted: number;
  totalTime: string;
  currentChapter: string;
}) {
  const items = [
    { label: "Lessons completed", value: String(lessonsCompleted), icon: BookOpen },
    { label: "Total time spent", value: totalTime, icon: Clock3 },
    { label: "Current chapter", value: currentChapter, icon: Layers3 }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <item.icon className="h-5 w-5 text-primary" />
          <div className="mt-6 text-sm text-muted">{item.label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-text">{item.value}</div>
        </Card>
      ))}
    </div>
  );
}
