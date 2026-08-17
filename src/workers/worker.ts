import {
  processExpiredReservations,
} from "./reservation-expiry.worker.js";

import { prisma } from "../db/prisma.js";
import { redis } from "../redis/redis.js";
import { WORKER_INTERVAL_MS } from "../constant.js";

const INTERVAL_MS = WORKER_INTERVAL_MS;

let shuttingDown = false;

async function run() {
  // console.log("🚀 Reservation worker started");

  while (!shuttingDown) {
    console.log("------⏳ while loop...------\n");
    try {
      const count =
        await processExpiredReservations();

      if (count > 0) {
        console.log(
          `⏰ Expired ${count} reservations`,
        );
      }
    } catch (error) {
      console.error(
        "❌ Reservation expiry failed:",
        error,
      );
    }

    if (!shuttingDown) {
      await sleep(INTERVAL_MS);
    }
  }

  console.log("🛑 Reservation worker stopping...");

  await prisma.$disconnect();

  // If your redis client exposes quit()
  await redis.quit();

  console.log("🛑 Reservation worker stopped");
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(async (error) => {
  console.error("❌ Worker crashed:", error);

  await prisma.$disconnect();

  try {
    await redis.quit();
  } catch {
    // ignore redis shutdown errors
  }

  process.exit(1);
});