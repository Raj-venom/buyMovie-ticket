import { prisma } from "../../../db/prisma.js";
import { redis } from "../../../redis/redis.js";
import type { CreateReservationInput } from "./reservation.schema.js";
import { ReservationError } from "../../../errors/reservation-error.js";
import { Prisma } from "../../../generated/prisma/edge.js";

const RESERVATION_DURATION_MINUTES = 10;

export async function createReservation(
    input: CreateReservationInput,
) {

    const { showId, guest, seatIds } = input;

    const expiresAt = new Date(
        Date.now() +
        RESERVATION_DURATION_MINUTES * 60 * 1000,
    );

    const reservation = await prisma.$transaction(
        async (tx) => {

            /*
            * Find the show and check if it's available for booking.
            */

            const show = await tx.show.findUnique({
                where: {
                    id: input.showId,
                },
                select: {
                    id: true,
                    startTime: true,
                    status: true,
                },
            });

            if (!show) {
                throw new ReservationError(
                    "SHOW_NOT_FOUND",
                    "Show not found.",
                );
            }

            if (show.status !== "SCHEDULED") {
                throw new ReservationError(
                    "SHOW_NOT_AVAILABLE",
                    "This show is not available for booking.",
                );
            }

            if (show.startTime <= new Date()) {
                throw new ReservationError(
                    "SHOW_ALREADY_STARTED",
                    "This show has already started.",
                );
            }

            /*
            * Find all ShowSeat records belonging to this show.
            *
            * We lock them using PostgreSQL FOR UPDATE.
            */

            const seatIds = Prisma.join(input.seatIds);

            const showSeats = await tx.$queryRaw<
                Array<{
                    id: string;
                    seat_id: string;
                    status: string;
                    price: string;
                    reserved_until: Date | null;
                }>
            >`
        SELECT
            ss.id,
            ss."seatId" AS seat_id,
            ss.status,
            ss.price::text,
            ss."reservedUntil" AS reserved_until
        FROM "ShowSeat" ss
        WHERE ss."showId"::text = ${input.showId}
            AND ss."seatId"::text IN (${seatIds})
        ORDER BY ss.id
        FOR UPDATE
        `;

            /*
            * Every requested seat must exist for this show.
            */

            if (showSeats.length !== input.seatIds.length) {
                throw new ReservationError(
                    "SEAT_NOT_FOUND",
                    "One or more seats do not belong to this show.",
                );
            }

            /*
             * Check availability while the rows are locked.
             */

            const unavailableSeats = showSeats.filter((seat) => {
                if (seat.status === "AVAILABLE") {
                    return false;
                }

                /*
                 * An expired reservation is effectively available.
                 */
                if (
                    seat.status === "RESERVED" &&
                    seat.reserved_until &&
                    seat.reserved_until < new Date()
                ) {
                    return false;
                }

                return true;
            });

            if (unavailableSeats.length > 0) {
                throw new ReservationError(
                    "SEAT_UNAVAILABLE",
                    "One or more selected seats are no longer available.",
                );
            }

            /*
            * Create/get guest.
            */

            const guestRecord = await tx.guest.upsert({
                where: {
                    phone: guest.phone,
                },
                update: {
                    name: guest.name,
                },
                create: {
                    name: guest.name,
                    phone: guest.phone,
                },
            });

            /*
                * Create reservation.
    
                */

            const newReservation = await tx.reservation.create({
                data: {
                    guestId: guestRecord.id,
                    showId,
                    expiresAt,
                    status: "ACTIVE",
                }
            })

            /*
           * Mark seats RESERVED.
           */

            await tx.showSeat.updateMany({
                where: {
                    id: {
                        in: showSeats.map((seat) => seat.id),
                    },
                },
                data: {
                    status: "RESERVED",
                    reservationId: newReservation.id,
                    reservedUntil: expiresAt,
                },
            });

            /*
      * Create reservation-seat records.
      */
            await tx.reservationSeat.createMany({
                data: showSeats.map((seat) => ({
                    reservationId: newReservation.id,
                    showSeatId: seat.id,
                })),
            });

            return newReservation;
        },
        {
            isolationLevel: "ReadCommitted",
        },
    );


    /*
  * PostgreSQL is now committed.
  *
  * Invalidate the cached seat map.
  */
    await redis.del(
        `show:${input.showId}:seatmap`,
    );

    return getReservation(reservation.id);

}


export async function getReservation(
    reservationId: string,
) {
    return prisma.reservation.findUnique({
        where: {
            id: reservationId,
        },
        include: {
            guest: true,

            show: {
                include: {
                    movie: true,

                    screen: {
                        include: {
                            theater: true,
                        },
                    },
                },
            },

            seats: {
                include: {
                    showSeat: {
                        include: {
                            seat: true,
                        },
                    },
                },
            },
        },
    });
}





