import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { redis } from "./redis/redis.js";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log("HTTP server closed");

    try {
      await prisma.$disconnect();
      console.log("PostgreSQL disconnected");

      await redis.quit();
      console.log("Redis disconnected");

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});