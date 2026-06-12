import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import type { Team } from "../../shared/match";
import { cn } from "../lib/utils";

type TeamLogoProps = {
  team?: Team;
  className?: string;
};

export function TeamLogo({ team, className }: TeamLogoProps) {
  const logo = team?.darkModeImageUrl || team?.imageUrl || "";
  const [failedLogo, setFailedLogo] = useState<string | null>(null);

  useEffect(() => {
    setFailedLogo(null);
  }, [logo]);

  const showImage = logo !== "" && failedLogo !== logo;

  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center md:size-9",
        className
      )}
    >
      {showImage ? (
        <img
          alt=""
          className="object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
          decoding="async"
          loading="lazy"
          onError={() => setFailedLogo(logo)}
          src={logo}
          style={{ height: 24, width: 24 }}
        />
      ) : (
        <Shield aria-hidden className="size-4 text-[var(--text-disabled)] md:size-[18px]" strokeWidth={1.6} />
      )}
    </span>
  );
}
