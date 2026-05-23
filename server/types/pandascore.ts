export type PandaScoreOpponentTeam = {
  id?: number | string | null;
  name?: string | null;
  acronym?: string | null;
  image_url?: string | null;
  dark_mode_image_url?: string | null;
  location?: string | null;
};

export type PandaScoreOpponent = {
  opponent?: PandaScoreOpponentTeam | null;
  type?: string | null;
};

export type PandaScoreLeague = {
  id?: number | string | null;
  name?: string | null;
  image_url?: string | null;
};

export type PandaScoreSerie = {
  full_name?: string | null;
  name?: string | null;
};

export type PandaScoreTournament = {
  name?: string | null;
  type?: string | null;
  country?: string | null;
  region?: string | null;
  tier?: string | null;
  prizepool?: string | null;
  has_bracket?: boolean | null;
  detailed_stats?: boolean | null;
};

export type PandaScoreStream = {
  raw_url?: string | null;
};

export type PandaScoreVideogame = {
  slug?: string | null;
  name?: string | null;
};

export type PandaScoreResult = {
  team_id?: number | string | null;
  score?: number | null;
};

export type PandaScoreWinner = {
  id?: number | string | null;
  name?: string | null;
  acronym?: string | null;
};

export type PandaScoreGame = {
  id?: number | string | null;
  position?: number | null;
  status?: string | null;
  length?: number | null;
  winner?: {
    id?: number | string | null;
  } | null;
};

export type PandaScoreMatch = {
  id?: number | string | null;
  name?: string | null;
  begin_at?: string | null;
  end_at?: string | null;
  original_scheduled_at?: string | null;
  updated_at?: string | null;
  replay_url?: string | null;
  status?: string | null;
  number_of_games?: number | null;
  match_type?: string | null;
  rescheduled?: boolean | null;
  detailed_stats?: boolean | null;
  draw?: boolean | null;
  forfeit?: boolean | null;
  winner_id?: number | string | null;
  winner?: PandaScoreWinner | null;
  results?: PandaScoreResult[] | null;
  games?: PandaScoreGame[] | null;
  league?: PandaScoreLeague | null;
  serie?: PandaScoreSerie | null;
  tournament?: PandaScoreTournament | null;
  opponents?: PandaScoreOpponent[] | null;
  streams_list?: PandaScoreStream[] | null;
  videogame?: PandaScoreVideogame | null;
};
