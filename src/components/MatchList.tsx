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
    <motion.div className="timeline-list relative z-0 grid gap-3" ref={containerRef}>
      <div aria-hidden ref={topSentinelRef} />
      {matches.map((match) => {
        const shouldShowDate = match.displayDate !== previousDate;
        previousDate = match.displayDate;
        const enteringIndex = enteringMatchIndexMap.get(match.id);
        const enterDelay = enteringIndex != null ? (enteringIndex < 6 ? enteringIndex * 0.025 : 0) : 0;

        return (
          <div key={match.id}>
            {shouldShowDate ? (
              <div className="sticky top-2 z-20 -mx-1 mb-3 w-max rounded-full border border-stone-200 bg-white/92 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm shadow-stone-900/10 backdrop-blur-sm">
                {match.displayDate}
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
            <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 sm:p-5" key={`load-more-skeleton-${skeletonIndex}`}>
              <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <div className="h-4 w-12 animate-pulse rounded bg-stone-200/80" />
                  <div className="h-4 w-10 animate-pulse rounded bg-stone-200/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-stone-200/80" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-stone-200/70" />
                  <div className="h-4 w-56 animate-pulse rounded bg-stone-200/70" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      ) : null}
      <div aria-hidden ref={bottomSentinelRef} />
    </motion.div>
  );
}
