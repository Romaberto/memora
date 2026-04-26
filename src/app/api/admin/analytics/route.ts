import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getGa4VisitorsSeries } from "@/lib/ga4-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 360;
const DEFAULT_RANGE_DAYS = 30;

type SeriesPoint = {
  date: string;
  count: number;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatUtcYmd(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmd(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function inclusiveDayCount(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function resolveRange(searchParams: URLSearchParams) {
  const today = startOfUtcDay(new Date());
  const requestedFrom = parseYmd(searchParams.get("from"));
  const requestedTo = parseYmd(searchParams.get("to"));
  const presetDays = Number(searchParams.get("days") || "");

  const defaultFrom = addUtcDays(today, -(DEFAULT_RANGE_DAYS - 1));

  let from = requestedFrom ?? defaultFrom;
  let to = requestedTo ?? today;

  if (!requestedFrom && Number.isFinite(presetDays) && presetDays > 0) {
    const clampedPreset = Math.min(MAX_RANGE_DAYS, Math.max(1, Math.floor(presetDays)));
    from = addUtcDays(today, -(clampedPreset - 1));
    to = today;
  }

  if (from.getTime() > to.getTime()) {
    [from, to] = [to, from];
  }

  if (to.getTime() > today.getTime()) {
    to = today;
  }

  const rangeDays = inclusiveDayCount(from, to);
  if (rangeDays > MAX_RANGE_DAYS) {
    from = addUtcDays(to, -(MAX_RANGE_DAYS - 1));
  }

  return {
    from,
    to,
    days: inclusiveDayCount(from, to),
    maxDays: MAX_RANGE_DAYS,
  };
}

async function daySeries(
  tableName: "User" | "QuizRequest" | "QuizSession",
  from: Date,
  to: Date,
  extraJoinClause?: Prisma.Sql,
) {
  const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
    SELECT
      gs.day::date AS day,
      COALESCE(COUNT(t."id"), 0)::bigint AS count
    FROM generate_series(
      ${from}::timestamptz,
      ${to}::timestamptz,
      interval '1 day'
    ) AS gs(day)
    LEFT JOIN ${Prisma.raw(`"${tableName}"`)} t
      ON t."createdAt" >= gs.day
     AND t."createdAt" < gs.day + interval '1 day'
     ${extraJoinClause ?? Prisma.empty}
    GROUP BY gs.day
    ORDER BY gs.day ASC
  `);

  return rows.map((row) => ({
    date: formatUtcYmd(startOfUtcDay(new Date(row.day))),
    count: Number(row.count ?? 0),
  }));
}

function totalCount(series: SeriesPoint[]) {
  return series.reduce((sum, point) => sum + point.count, 0);
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const range = resolveRange(request.nextUrl.searchParams);

  const [signups, quizzesGenerated, sessionsPlayed, visitors] = await Promise.all([
    daySeries(
      "User",
      range.from,
      range.to,
      Prisma.sql`AND (t."email" IS NULL OR t."email" <> 'guest@memorize.local')`,
    ),
    daySeries(
      "QuizRequest",
      range.from,
      range.to,
      Prisma.sql`AND t."usedFallback" = false`,
    ),
    daySeries("QuizSession", range.from, range.to),
    getGa4VisitorsSeries({
      from: formatUtcYmd(range.from),
      to: formatUtcYmd(range.to),
    }),
  ]);

  return NextResponse.json({
    from: formatUtcYmd(range.from),
    to: formatUtcYmd(range.to),
    days: range.days,
    maxDays: range.maxDays,
    signups: {
      total: totalCount(signups),
      series: signups,
    },
    quizzesGenerated: {
      total: totalCount(quizzesGenerated),
      series: quizzesGenerated,
    },
    sessionsPlayed: {
      total: totalCount(sessionsPlayed),
      series: sessionsPlayed,
    },
    visitors: visitors.ok
      ? {
          available: true,
          trackingEnabled: true,
          total: visitors.total,
          series: visitors.series,
          reason: "",
        }
      : {
          available: false,
          trackingEnabled: visitors.trackingEnabled,
          total: visitors.total,
          series: visitors.series,
          reason: visitors.reason,
        },
  });
}
