import { prisma } from "../../../db/prisma.js";
import { redis } from "../../../redis/redis.js";
import { env } from "../../../config/env.js";


function cacheKey(showId: string) {
    return `show:${showId}:seatmap`;
}

export async function getSeatMap(showId: string) {
    const key = cacheKey(showId);

    const cached = await redis.get(key);

    if (cached) {
        console.log(`🎯 Redis HIT: ${key}`);
        return JSON.parse(cached);
    }

    console.log(`🐘 Redis MISS: ${key}`);
    const seats = await prisma.showSeat.findMany({
        where: { showId },
        include: { seat: true },
        orderBy: [
            {
                seat: {
                    seatRow: "asc"
                }
            },
            {
                seat: {
                    seatNumber: "asc"
                }
            }
        ]
    })


    await redis.set(
        key,
        JSON.stringify(seats),
        "EX",
        env.SEATMAP_CACHE_TTL_SECONDS,
    );

    return seats;

}
