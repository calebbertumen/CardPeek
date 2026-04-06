import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function SearchResultsSkeleton() {
  return (
    <div className="mt-12 space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="mx-auto w-full max-w-[240px] space-y-4">
          <Skeleton className="aspect-[63/88] w-full rounded-2xl" />
          <div className="space-y-2 text-center lg:text-left">
            <Skeleton className="mx-auto h-7 w-48 lg:mx-0" />
            <Skeleton className="mx-auto h-4 w-36 lg:mx-0" />
          </div>
        </div>
        <Card className="border-border/60 shadow-lg shadow-black/25">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Separator />
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
