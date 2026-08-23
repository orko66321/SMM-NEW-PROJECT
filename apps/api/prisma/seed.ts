import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { ARGON2_OPTIONS } from "../src/services/auth.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

// Demo-only credentials, clearly labeled as such — never used as a
// fallback in production auth logic, only to seed a local/dev database.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!Admin";
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!User";

async function main() {
  const adminHash = await argon2.hash(ADMIN_PASSWORD, ARGON2_OPTIONS);
  const userHash = await argon2.hash(USER_PASSWORD, ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@smmpanel.local" },
    update: {},
    create: {
      username: "admin",
      email: "admin@smmpanel.local",
      passwordHash: adminHash,
      role: "ADMIN",
      wallet: { create: { balance: 0 } },
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@smmpanel.local" },
    update: {},
    create: {
      username: "demo_user",
      email: "demo@smmpanel.local",
      passwordHash: userHash,
      role: "USER",
      wallet: { create: { balance: 50 } },
    },
  });

  const categories: { name: string; platform: string }[] = [
    { name: "Instagram Followers", platform: "Instagram" },
    { name: "Instagram Likes", platform: "Instagram" },
    { name: "YouTube Views", platform: "YouTube" },
    { name: "TikTok Followers", platform: "TikTok" },
    { name: "Facebook Page Likes", platform: "Facebook" },
  ];

  for (const [index, cat] of categories.entries()) {
    const category = await prisma.serviceCategory.upsert({
      where: { id: `seed-category-${index}` },
      update: {},
      create: { id: `seed-category-${index}`, name: cat.name, platform: cat.platform, sortOrder: index },
    });

    await prisma.service.upsert({
      where: { id: `seed-service-${index}` },
      update: {},
      create: {
        id: `seed-service-${index}`,
        categoryId: category.id,
        name: `${cat.name} — High Quality`,
        description: "Gradual, non-drop delivery. Demo seed data.",
        sellPricePer1000: 1.2 + index * 0.3,
        providerCostPer1000: 0.6 + index * 0.15,
        minQuantity: 100,
        maxQuantity: 100_000,
        refillEnabled: true,
        cancelEnabled: false,
        status: "ACTIVE",
      },
    });
  }

  const manualMethods: {
    id: string;
    title: string;
    accountType: "PERSONAL" | "AGENT";
    accountNumber: string;
    instructions: string;
    bonusPercent: number;
  }[] = [
    {
      id: "seed-method-bkash-1",
      title: "bKash Personal #1",
      accountType: "PERSONAL",
      accountNumber: "01700000001",
      instructions: "Send Money (not Cash Out/Payment) to this number, then submit the Transaction ID below.",
      bonusPercent: 0,
    },
    {
      id: "seed-method-nagad-1",
      title: "Nagad Agent",
      accountType: "AGENT",
      accountNumber: "01800000002",
      instructions: "Cash Out to this Nagad Agent number, then submit the Transaction ID below.",
      bonusPercent: 2,
    },
  ];

  for (const [index, m] of manualMethods.entries()) {
    await prisma.paymentMethod.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        gatewayType: "MANUAL",
        accountType: m.accountType,
        accountNumber: m.accountNumber,
        instructions: m.instructions,
        minAmount: 0.2,
        maxAmount: 1000,
        bonusPercent: m.bonusPercent,
        status: "ACTIVE",
        sortOrder: index,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${admin.email} / ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`Demo user login: ${demoUser.email} / ${USER_PASSWORD}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
