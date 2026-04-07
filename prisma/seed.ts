import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GUEST_EMAIL = "guest@memorize.local";

async function main() {
  await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    create: { email: GUEST_EMAIL, name: "Guest" },
    update: {},
  });
  console.log("Seed: guest user ready at", GUEST_EMAIL);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
