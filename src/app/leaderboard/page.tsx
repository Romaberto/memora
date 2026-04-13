import { requireUserId } from "@/lib/auth";
import { getLeaderboard, findUserRank, type LeaderboardPeriod } from "@/lib/leaderboard";
import { LeaderboardView } from "./leaderboard-view";

type Props = { searchParams: { p?: string; tab?: string } };

function parsePeriod(raw: string | undefined): LeaderboardPeriod {
  if (raw === "month" || raw === "week") return raw;
  return "alltime";
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const userId = await requireUserId();
  const period = parsePeriod(searchParams.p);
  const entries = await getLeaderboard(period, 100);
  const userRank = findUserRank(entries, userId);

  return (
    <LeaderboardView
      entries={entries}
      currentUserId={userId}
      userRank={userRank}
      period={period}
      initialTab={searchParams.tab === "leagues" ? "leagues" : "global"}
    />
  );
}
