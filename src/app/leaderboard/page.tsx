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
  const [activityEntries, competitiveEntries] = await Promise.all([
    getLeaderboard(period, 100, "activity"),
    getLeaderboard(period, 250, "competitive"),
  ]);
  const userRank = findUserRank(activityEntries, userId);

  return (
    <LeaderboardView
      entries={activityEntries}
      competitiveEntries={competitiveEntries}
      currentUserId={userId}
      userRank={userRank}
      period={period}
      initialTab={
        searchParams.tab === "leagues" ||
        searchParams.tab === "challenges" ||
        searchParams.tab === "pvp"
          ? searchParams.tab
          : "active"
      }
    />
  );
}
