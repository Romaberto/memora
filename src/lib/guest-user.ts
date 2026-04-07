import prisma from "./db";

const GUEST_EMAIL = "guest@memorize.local";

/**
 * All visitors share one persisted guest user so existing `userId` relations stay valid.
 */
export async function getGuestUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    create: {
      email: GUEST_EMAIL,
      name: "Guest",
    },
    update: {},
    select: { id: true },
  });
  return user.id;
}
