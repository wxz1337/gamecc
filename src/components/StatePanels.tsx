import { AlertCircle, CalendarX2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function LoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Card className="p-4" key={index}>
          <div className="flex gap-4">
            <div className="w-16 shrink-0 space-y-2">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="grid place-items-center gap-4 border-rose-200 bg-rose-50/70 p-8 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-white text-rose-600 shadow-sm">
        <AlertCircle className="size-5" />
      </div>
      <div>
        <p className="text-base font-semibold text-zinc-950">赛程数据暂时获取失败</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">{message}</p>
      </div>
      <Button onClick={onRetry} type="button">
        <RefreshCw className="size-4" />
        重试
      </Button>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="grid place-items-center gap-3 border-dashed p-10 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-500">
        <CalendarX2 className="size-5" />
      </div>
      <p className="text-base font-semibold text-zinc-950">暂无比赛</p>
      <p className="max-w-xl text-sm leading-6 text-zinc-600">{message}</p>
    </Card>
  );
}
