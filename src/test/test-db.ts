import { prisma } from "../db/prisma.js";
import { redis } from "../redis/redis.js";

async function main() {
  console.log("🔍 Checking infrastructure...\n");

  // PostgreSQL
  try {
    await prisma.$connect();

    await prisma.$queryRaw`SELECT 1`;

    console.log("✅ PostgreSQL connected");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed");
    console.error(error);
  }

  // Redis
  try {
    const response = await redis.ping();

    if (response === "PONG") {
      console.log("✅ Redis connected");
    } else {
      console.log(`⚠️ Redis responded with: ${response}`);
    }
  } catch (error) {
    console.error("❌ Redis connection failed");
    console.error(error);
  }

  // Cleanup
  await prisma.$disconnect();
  await redis.quit();

  console.log("\n🏁 Infrastructure check completed");
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});