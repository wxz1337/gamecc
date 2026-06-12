import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import type { Match } from "../../shared/match";
import { MatchCard } from "./MatchCard";

type MatchListProps = {
  matches: Match[];
  isLoadingMore?: boolean;
  onNearEnd: () => void;
  onNearStart: () => void;
  onVisibleDateChange: (date: string) => void;
};

export function MatchList({ matches, isLoadingMore = false, onNearEnd, onNearStart, onVisibleDateChange }: MatchListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const previousMatchIdsRef = useRef<Set<string>>(new Set());

  const enteringMatchIds = useMemo(() => {
    const previousIds = previousMatchIdsRef.current;

    if (previousIds.size === 0) {
      return [];
    }

    return matches.filter((match) => !previousIds.has(match.id)).map((match) => match.id);
  }, [matches]);
  const enteringMatchIndexMap = useMemo(() => new Map(enteringMatchIds.map((id, index) => [id, index])), [enteringMatchIds]);

  useEffect(() => {
    previousMatchIdsRef.current = new Set(matches.map((match) => match.id));
  }, [matches]);

  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!topSentinel || !bottomSentinel) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (entry.target === topSentinel) {
            onNearStart();
          }

          if (entry.target === bottomSentinel) {
            onNearEnd();
          }
        }
      },
      { rootMargin: "180px 0px 520px 0px" }
    );

    observer.observe(topSentinel);
    observer.observe(bottomSentinel);

    return () => {
      observer.disconnect();
    };
  }, [onNearEnd, onNearStart]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const dateNodes = Array.from(container.querySelectorAll<HTMLElement>("[data-match-date]"));
    if (dateNodes.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        const nextDate = visibleEntry?.target.getAttribute("data-match-date");
        if (nextDate) {
          onVisibleDateChange(nextDate);
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0.01 }
    );

    dateNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [matches, onVisibleDateChange]);

  let previousDate = "";

  return (
    <motion.div className="timeline-list relative z-0 grid gap-2" ref={containerRef}>
      <div aria-hidden ref={topSentinelRef} />
      {matches.map((match) => {
        const shouldShowDate = match.displayDate !== previousDate;
        previousDate = match.displayDate;
        const enteringIndex = enteringMatchIndexMap.get(match.id);
        const enterDelay = enteringIndex != null ? (enteringIndex < 6 ? enteringIndex * 0.025 : 0) : 0;

        return (
          <div key={match.id}>
            {shouldShowDate ? (
              <div className="mb-0.5 flex min-h-8 items-center gap-3 text-xs font-medium text-[var(--text-tertiary)]" data-date-group>
                <span className="shrink-0 text-[var(--text-secondary)]">{match.displayDate}</span>
                <span className="h-px w-16 bg-[rgba(255,255,255,0.035)] sm:w-24" aria-hidden />
              </div>
            ) : null}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              data-match-date={match.displayDate}
              data-match-id={match.id}
              initial={enteringIndex != null ? { opacity: 0, y: 10 } : false}
              layout="position"
              transition={{
                duration: 0.18,
                ease: [0.22, 1, 0.36, 1],
                delay: enterDelay
              }}
            >
              <MatchCard match={match} />
            </motion.div>
          </div>
        );
      })}
      {isLoadingMore ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-2"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {Array.from({ length: 3 }).map((_, skeletonIndex) => (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 md:min-h-[84px]" key={`load-more-skeleton-${skeletonIndex}`}>
              <div className="grid gap-3 md:grid-cols-[112px_minmax(0,1fr)_minmax(150px,180px)_44px] md:items-center 2xl:grid-cols-[112px_minmax(0,1fr)_220px_44px] 2xl:gap-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-12 animate-pulse rounded bg-[rgba(207,218,237,0.12)]" />
                  <div className="h-4 w-10 animate-pulse rounded bg-[rgba(207,218,237,0.1)]" />
                </div>
                <div className="grid w-full max-w-[680px] grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-3 justify-self-center 2xl:gap-4">
                  <div className="h-5 w-28 justify-self-end animate-pulse rounded bg-[rgba(207,218,237,0.12)]" />
                  <div className="h-5 w-10 justify-self-center animate-pulse rounded bg-[rgba(207,218,237,0.1)]" />
                  <div className="h-5 w-28 animate-pulse rounded bg-[rgba(207,218,237,0.12)]" />
                </div>
                <div className="hidden h-10 w-full animate-pulse rounded bg-[rgba(207,218,237,0.08)] md:block" />
                <div className="hidden size-11 animate-pulse rounded-full bg-[rgba(207,218,237,0.1)] md:block" />
              </div>
            </div>
          ))}
        </motion.div>
      ) : null}
      <div aria-hidden ref={bottomSentinelRef} />
    </motion.div>
  );
}
