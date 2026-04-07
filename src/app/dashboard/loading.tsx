import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-6 h-32 w-full" />
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-4 h-20 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
