import { prisma } from "../db/prisma.js";
import { redis } from "../redis/redis.js";

const BATCH_SIZE = 100;

export async function processExpiredReservations() {
    const now = new Date();

    // console.log("processExpiredReservations", now);
    const expiredReservations = await prisma.$transaction(
        async (tx) => {
            /*
             * Lock a batch of expired reservations.
             *
             * SKIP LOCKED allows multiple workers to run safely.
             */
            const reservations = await tx.$queryRaw<
                Array<{
                    id: string;
                    show_id: string;
                }>
            >`
        SELECT
          r.id,
          r."showId" AS show_id
        FROM "Reservation" r
        WHERE r.status = 'ACTIVE'
          AND r."expiresAt" <= ${now}
        ORDER BY r."expiresAt"
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `;

            if (reservations.length === 0) {
                return [];
            }

            const reservationIds =
                reservations.map((r) => r.id);

            /*
             * ACTIVE → EXPIRED
             */
            await tx.reservation.updateMany({
                where: {
                    id: {
                        in: reservationIds,
                    },
                    status: "ACTIVE",
                    expiresAt: {
                        lte: now,
                    },
                },
                data: {
                    status: "EXPIRED",
                },
            });

            /*
             * RESERVED → AVAILABLE
             */
            await tx.showSeat.updateMany({
                where: {
                    reservationId: {
                        in: reservationIds,
                    },
                    status: "RESERVED",
                },
                data: {
                    status: "AVAILABLE",
                    reservationId: null,
                    reservedUntil: null,
                },
            });

            return reservations;
        },
        {
            maxWait: 5_000,
            timeout: 10_000, 
        }
    );

    if (expiredReservations.length === 0) {
        // console.log("✅ No expired reservations found");
        return 0;
    }

    /*
     * Invalidate seat-map cache.
     *
     * Multiple reservations may belong to the same show,
     * so remove duplicates.
     */
    const showIds = [
        ...new Set(
            expiredReservations.map(
                (reservation) => reservation.show_id,
            ),
        ),
    ];

    if (showIds.length) {
        await redis.del(
            ...showIds.map((showId) => `show:${showId}:seatmap`)
        );
    }

    // console.log("✅ Expired reservations processed:", expiredReservations.length);
    return expiredReservations.length;
}