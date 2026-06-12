import { Crosshair, Gamepad2 } from "lucide-react";
import type { GameFilter } from "../../shared/match";
import { cn } from "../lib/utils";

type GameIconProps = {
  game: GameFilter;
  className?: string;
};

type GameIconTileProps = GameIconProps & {
  selected?: boolean;
  iconClassName?: string;
};

const GAME_ICON_TONES: Record<GameFilter, string> = {
  all: "text-[var(--text-secondary)]",
  lol: "text-[#d2a84f]",
  cs2: "text-[#eba84e]",
  valorant: "text-[#ff5f6d]"
};

export function GameIcon({ game, className }: GameIconProps) {
  if (game === "all") {
    return <Gamepad2 aria-hidden className={cn("size-4", GAME_ICON_TONES[game], className)} strokeWidth={2} />;
  }

  if (game === "lol") {
    return (
      <svg aria-hidden className={cn("size-4", GAME_ICON_TONES[game], className)} viewBox="0 0 24 24">
        <circle cx="12" cy="12" fill="none" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.2 5.7v11.5h6.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      </svg>
    );
  }

  if (game === "cs2") {
    return <Crosshair aria-hidden className={cn("size-4", GAME_ICON_TONES[game], className)} strokeWidth={2} />;
  }

  return (
    <svg aria-hidden className={cn("size-4", GAME_ICON_TONES[game], className)} viewBox="0 0 24 24">
      <path d="M3.8 5.2 10.3 18h3.1L8.1 8 6.4 5.2Z" fill="currentColor" />
      <path d="m10.4 5.2 3.9 7.2 6-7.2h-3.7l-3.3 4-2.1-4Z" fill="currentColor" />
    </svg>
  );
}

export function GameIconTile({ game, selected = false, className, iconClassName }: GameIconTileProps) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center transition-[opacity,transform] duration-200",
        selected ? "opacity-100" : "opacity-85",
        className
      )}
    >
      <GameIcon className={cn("size-4", iconClassName)} game={game} />
    </span>
  );
}
