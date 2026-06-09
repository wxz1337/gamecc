import { AlertCircle, CalendarX2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function LoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Card className="p-4 shadow-none sm:p-5" key={index}>
          <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
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
    <Card className="grid place-items-center gap-4 border-[rgba(255,107,122,0.24)] bg-[rgba(255,107,122,0.08)] p-8 text-center shadow-none">
      <div className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-[rgba(255,107,122,0.12)] text-[var(--status-danger)] ring-1 ring-[rgba(255,107,122,0.24)]">
        <AlertCircle className="size-5" />
      </div>
      <div>
        <p className="text-base font-bold text-[var(--text-primary)]">赛程数据暂时获取失败</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
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
    <Card className="grid place-items-center gap-3 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-10 text-center shadow-none">
      <div className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-[var(--bg-surface-hover)] text-[var(--text-tertiary)] ring-1 ring-[var(--border-default)]">
        <CalendarX2 className="size-5" />
      </div>
      <p className="text-base font-bold text-[var(--text-primary)]">暂无比赛</p>
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
    </Card>
  );
}
