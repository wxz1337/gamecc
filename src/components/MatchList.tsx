import { motion } from "framer-motion";
import type { Match } from "../../shared/match";
import { MatchCard } from "./MatchCard";

export function MatchList({ matches }: { matches: Match[] }) {
  return (
    <motion.div className="grid gap-3" layout>
      {matches.map((match, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          key={match.id}
          transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }}
        >
          <MatchCard match={match} />
        </motion.div>
      ))}
    </motion.div>
  );
}
