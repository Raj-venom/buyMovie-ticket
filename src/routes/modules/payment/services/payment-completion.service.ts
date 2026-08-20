import { prisma } from "../../../../db/prisma.js";

import {
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    ReservationStatus,
    SeatStatus,
} from "../../../../generated/prisma/client.js";

interface CompletePaymentInput {
    paymentId: string;
    transactionUuid?: string;
    providerReference?: string | null;
}



export async function completePayment(
    input: CompletePaymentInput,
) {

    return prisma.$transaction(
        async (tx) => {

            const payment =
                await tx.payment.findUnique({
                    where: {
                        id: input.paymentId,
                    },

                    include: {
                        reservation: {
                            include: {
                                guest: true,
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
                        },

                        attempts: true,
                    },
                });

            if (!payment) {
                throw new Error(
                    "PAYMENT_NOT_FOUND",
                );
            }

            /*
             * Idempotency.
             *
             * eSewa may redirect/callback more than once.
             */
            if (
                payment.status ===
                PaymentStatus.SUCCESS
            ) {
                return payment;
            }

            if (
                payment.status !==
                PaymentStatus.PENDING
            ) {
                throw new Error(
                    "PAYMENT_NOT_PENDING",
                );
            }

            const reservation =
                payment.reservation;

            /*
             * Reservation must still be valid.
             */
            if (
                reservation.status !==
                ReservationStatus.ACTIVE
            ) {
                throw new Error(
                    "RESERVATION_NOT_ACTIVE",
                );
            }

            if (
                reservation.expiresAt <=
                new Date()
            ) {
                throw new Error(
                    "RESERVATION_EXPIRED",
                );
            }

            /*
             * Make sure the payment method is valid for this reservation.
             */
            let attempt = null;

            if (payment.method === PaymentMethod.WALLET) {
                if (!input.transactionUuid) {
                    throw new Error(
                        "TRANSACTION_UUID_REQUIRED",
                    );
                }

                attempt = payment.attempts.find(
                    (attempt) =>
                        attempt.transactionUuid ===
                        input.transactionUuid,
                );

                if (!attempt) {
                    throw new Error(
                        "PAYMENT_ATTEMPT_NOT_FOUND",
                    );
                }
            }
            /*
             * Make sure all seats are still held
             * by this reservation.
             */
            const invalidSeat =
                reservation.seats.some(
                    (reservationSeat) =>
                        reservationSeat.showSeat.status !==
                        SeatStatus.RESERVED ||
                        reservationSeat.showSeat
                            .reservationId !==
                        reservation.id,
                );

            if (invalidSeat) {
                throw new Error(
                    "SEATS_NOT_RESERVED",
                );
            }

            /*
             * Create Booking.
             */
            const bookingNumber =
                generateBookingNumber();

            const booking =
                await tx.booking.create({
                    data: {

                        reservationId:
                            reservation.id,

                        paymentId:
                            payment.id,

                        guestId:
                            reservation.guestId,

                        status:
                            BookingStatus.CONFIRMED,

                        bookingNumber,

                        subtotal:
                            payment.amount,

                        discount: 0,

                        tax: 0,

                        totalAmount:
                            payment.amount,

                        currency:
                            payment.currency,

                        confirmedAt:
                            new Date(),
                    },
                });

            /*
             * Snapshot seats into BookingSeat.
             */
            await tx.bookingSeat.createMany({
                data:
                    reservation.seats.map(
                        (reservationSeat) => ({
                            bookingId:
                                booking.id,

                            showSeatId:
                                reservationSeat
                                    .showSeatId,

                            seatRow:
                                reservationSeat
                                    .showSeat
                                    .seat
                                    .seatRow,

                            seatNumber:
                                reservationSeat
                                    .showSeat
                                    .seat
                                    .seatNumber,

                            seatType:
                                reservationSeat
                                    .showSeat
                                    .seat
                                    .seatType,

                            price:
                                reservationSeat
                                    .showSeat
                                    .price,
                        }),
                    ),
            });

            /*
             * RESERVED → BOOKED
             */
            await tx.showSeat.updateMany({
                where: {
                    reservationId:
                        reservation.id,

                    status:
                        SeatStatus.RESERVED,
                },

                data: {
                    status:
                        SeatStatus.BOOKED,

                    reservationId:
                        null,

                    reservedUntil:
                        null,
                },
            });

            /*
             * Reservation → CONFIRMED
             */
            await tx.reservation.update({
                where: {
                    id:
                        reservation.id,
                },

                data: {
                    status:
                        ReservationStatus.COMPLETED,
                },
            });

            /*
             * Payment → SUCCESS
             */
            await tx.payment.update({
                where: {
                    id:
                        payment.id,
                },

                data: {
                    status:
                        PaymentStatus.SUCCESS,

                    paidAt:
                        new Date(),
                },
            });

            /*
            * Payment attempt → SUCCESS
            *
            * CASH payments do not have a provider payment attempt.
            */
            if (attempt) {
                await tx.paymentAttempt.update({
                    where: {
                        id: attempt.id,
                    },

                    data: {
                        status: PaymentStatus.SUCCESS,

                        providerTransactionId:
                            input.transactionUuid ?? null,

                        providerReference:
                            input.providerReference ?? null,

                        completedAt:
                            new Date(),
                    },
                });
            }

            return booking;
        },
        {
            maxWait: 10_000,
            timeout: 10_000,
        },
    );
}


function generateBookingNumber(): string {

    const timestamp =
        Date.now().toString(36)
            .toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    return `BK-${timestamp}-${random}`;
}