import { Skeleton } from "@/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-5 sm:px-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[72vh] w-full" />
    </div>
  );
}
