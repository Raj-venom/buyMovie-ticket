import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Seeding database...");

  const movie = await prisma.movie.create({
    data: {
      title: "Avengers",
      durationMin: 150,
      language: "English",
    },
  });

  const theater = await prisma.theater.create({
    data: {
      name: "QFX Civil Mall",
      city: "Kathmandu",
    },
  });

  const screen = await prisma.screen.create({
    data: {
      theaterId: theater.id,
      name: "Screen 1",
    },
  });

  const seats = [];

  for (const row of ["A", "B", "C", "D", "E"]) {
    for (let number = 1; number <= 10; number++) {
      seats.push({
        screenId: screen.id,
        seatRow: row,
        seatNumber: number,
        seatType: row === "E" ? "PREMIUM" : "REGULAR",
      });
    }
  }

  await prisma.seat.createMany({
    data: seats,
  });

  const startTime = new Date("2026-08-15T19:00:00+05:45");
  const endTime = new Date(
    startTime.getTime() + 150 * 60 * 1000,
  );

  const show = await prisma.show.create({
    data: {
      movieId: movie.id,
      screenId: screen.id,
      startTime,
      endTime,
    },
  });

  const dbSeats = await prisma.seat.findMany({
    where: {
      screenId: screen.id,
    },
  });

  await prisma.showSeat.createMany({
    data: dbSeats.map((seat) => ({
      showId: show.id,
      seatId: seat.id,
      price: seat.seatType === "PREMIUM" ? 500 : 300,
    })),
  });

  console.log("✅ Seed completed");
  console.log(`Movie: ${movie.id}`);
  console.log(`Show:  ${show.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });