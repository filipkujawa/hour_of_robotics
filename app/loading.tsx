import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10 sm:px-8">
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    </AppShell>
  );
}
