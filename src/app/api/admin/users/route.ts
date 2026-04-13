/**
 * GET /api/admin/users
 *
 * Paginated, filterable, sortable user list for the admin panel.
 * Admin-gated (see lib/admin.ts).
 *
 * Query params:
 *   page       – 1-based (default 1)
 *   pageSize   – rows per page (default 25, max 100)
 *   search     – case-insensitive match on email or name
 *   tier       – "free" | "pro" (optional filter)
 *   sort       – column to sort by (default "createdAt")
 *   order      – "asc" | "desc" (default "desc")
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SORT = [
  "createdAt",
  "email",
  "name",
  "subscriptionTier",
  "totalPoints",
  "quizCount",
] as const;
type SortField = (typeof ALLOWED_SORT)[number];

export async function GET(req: NextRequest) {
  // Auth
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const search = (url.searchParams.get("search") ?? "").trim();
  const tierFilter = url.searchParams.get("tier") as "free" | "pro" | null;
  const sortParam = (url.searchParams.get("sort") ?? "createdAt") as SortField;
  const sort = ALLOWED_SORT.includes(sortParam) ? sortParam : "createdAt";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  // Build where clause
  // eslint-disable-next-line
  const where: Record<string, unknown> = {};
  // Exclude guest user
  where.NOT = { email: "guest@memorize.local" };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { nickname: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tierFilter === "free" || tierFilter === "pro") {
    where.subscriptionTier = tierFilter;
  }

  // For sort by totalPoints or quizCount we need to fetch all matching users
  // and sort in memory after aggregation. For DB-native columns, use Prisma sort.
  const isComputedSort = sort === "totalPoints" || sort === "quizCount";

  let users;
  let totalCount: number;

  if (isComputedSort) {
    // Fetch all matching users + their sessions
    [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          image: true,
          role: true,
          subscriptionTier: true,
          country: true,
          createdAt: true,
          quizSessions: {
            where: { quizRequest: { usedFallback: false } },
            select: { score: true, percentage: true },
          },
          _count: { select: { quizRequests: { where: { usedFallback: false } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);
  } else {
    [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          image: true,
          role: true,
          subscriptionTier: true,
          country: true,
          createdAt: true,
          quizSessions: {
            where: { quizRequest: { usedFallback: false } },
            select: { score: true, percentage: true },
          },
          _count: { select: { quizRequests: { where: { usedFallback: false } } } },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
  }

  // Compute stats per user
  const rows = users.map((u) => {
    const totalPoints = u.quizSessions.reduce((sum, s) => sum + s.score, 0);
    const quizCount = u._count.quizRequests;
    const avgAccuracy =
      u.quizSessions.length > 0
        ? u.quizSessions.reduce((sum, s) => sum + s.percentage, 0) / u.quizSessions.length
        : null;

    // League based on total points
    let league = "Unranked";
    if (totalPoints >= 5000) league = "Diamond";
    else if (totalPoints >= 2000) league = "Platinum";
    else if (totalPoints >= 1000) league = "Gold";
    else if (totalPoints >= 500) league = "Silver";
    else if (totalPoints >= 100) league = "Bronze";
    else if (totalPoints > 0) league = "Starter";

    return {
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      email: u.email,
      image: u.image,
      role: u.role,
      subscriptionTier: u.subscriptionTier,
      country: u.country,
      createdAt: u.createdAt.toISOString(),
      totalPoints,
      quizCount,
      avgAccuracy: avgAccuracy != null ? Math.round(avgAccuracy * 10) / 10 : null,
      league,
    };
  });

  // If sorting by computed field, sort in memory then paginate
  if (isComputedSort) {
    const key = sort as "totalPoints" | "quizCount";
    rows.sort((a, b) => (order === "desc" ? b[key] - a[key] : a[key] - b[key]));
    const paginated = rows.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({
      users: paginated,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  }

  return NextResponse.json({
    users: rows,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
