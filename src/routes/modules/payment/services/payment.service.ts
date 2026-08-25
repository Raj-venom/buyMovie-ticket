import { prisma } from "../../../../db/prisma.js";

import {
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
    ReservationStatus,
} from "../../../../generated/prisma/browser.js";

import { Prisma } from "../../../../generated/prisma/client.js";

import { EsewaProvider } from "../providers/esewa.provider.js";

interface CreatePaymentInput {
    reservationId: string;
    method: PaymentMethod;
    provider?: PaymentProvider;
}

const esewaProvider = new EsewaProvider();

export async function createPayment(
    input: CreatePaymentInput,
) {

    const {
        reservationId,
        method,
        provider,
    } = input;

    const now = new Date();

    /*
     * Step 1:
     * Create the local payment transaction.
     */
    const result = await prisma.$transaction(
        async (tx) => {

            const reservation =
                await tx.reservation.findUnique({
                    where: {
                        id: reservationId,
                    },
                    include: {
                        seats: {
                            include: {
                                showSeat: true,
                            },
                        },
                    },
                });

            if (!reservation) {
                throw new Error("RESERVATION_NOT_FOUND");
            }

            if (
                reservation.status !==
                ReservationStatus.ACTIVE
            ) {
                throw new Error(
                    "RESERVATION_NOT_ACTIVE",
                );
            }

            if (
                reservation.expiresAt <= now
            ) {
                throw new Error(
                    "RESERVATION_EXPIRED",
                );
            }

            if (
                reservation.seats.length === 0 ||
                reservation.seats.some(
                    (seat) =>
                        seat.showSeat.status !==
                        "RESERVED" ||
                        seat.showSeat.reservationId !==
                        reservation.id,
                )
            ) {
                throw new Error(
                    "SEATS_NOT_RESERVED",
                );
            }

            /*
             * Only one Payment per Reservation.
             */
            const existingPayment =
                await tx.payment.findUnique({
                    where: {
                        reservationId:
                            reservation.id,
                    },
                });

            if (existingPayment) {

                /*
                 * Don't silently create another
                 * payment.
                 */
                if (
                    existingPayment.status ===
                    PaymentStatus.SUCCESS
                ) {
                    throw new Error(
                        "PAYMENT_ALREADY_COMPLETED",
                    );
                }

                return {
                    payment: existingPayment,
                    existing: true,
                };
            }

            /*
             * Validate payment method.
             */
            if (
                method === PaymentMethod.CASH &&
                provider
            ) {
                throw new Error("INVALID_PAYMENT_PROVIDER");
            }

            if (
                method === PaymentMethod.WALLET &&
                provider !== PaymentProvider.ESEWA
            ) {
                throw new Error(
                    "INVALID_PAYMENT_PROVIDER",
                );
            }

            /*
             * Calculate authoritative amount
             * from ShowSeat.
             */
            const amount =
                reservation.seats.reduce(
                    (total, reservationSeat) =>
                        total.add(
                            reservationSeat.showSeat.price,
                        ),
                    new Prisma.Decimal(0),
                );

            const payment =
                await tx.payment.create({
                    data: {
                        reservationId:
                            reservation.id,

                        method,

                        provider:
                            method ===
                                PaymentMethod.WALLET
                                ? provider
                                : null,

                        amount,

                        currency: "NPR",

                        status:
                            PaymentStatus.PENDING,

                        expiresAt:
                            reservation.expiresAt,
                    },
                });

            const transactionUuid = `payment-${payment.id}`;

            /*
             * First payment attempt.
             */
            const attempt =
                await tx.paymentAttempt.create({
                    data: {
                        paymentId:
                            payment.id,

                        attemptNo: 1,

                        status:
                            PaymentStatus.PENDING,

                        amount,
                        transactionUuid,

                        idempotencyKey:
                            crypto.randomUUID(),
                            providerStatus: "INITIATED",

                        startedAt: now,
                    },
                });

            return {
                payment,
                attempt,
                existing: false,
            };
        },
        {
            maxWait: 10_000,
            timeout: 10_000,
        },
    );

    /*
     * Existing payment:
     * return it instead of initiating another
     * provider transaction.
     */
    if (result.existing) {
        return {
            payment: result.payment,
        };
    }

    /*
     * Step 2:
     * Generate eSewa transaction details
     * OUTSIDE the DB transaction.
     */
    const transactionUuid =
        `payment-${result.payment.id}`;

    const providerResult =
        await esewaProvider.initiatePayment({
            paymentId: result.payment.id,

            transactionUuid,

            amount:
                result.payment.amount.toString(),

            reservationId,
        });

    /*
     * Step 3:
     * Store provider transaction information.
     */

    return {
        payment: result.payment,

        provider: {
            name: "ESEWA",

            redirectUrl:
                providerResult.redirectUrl,

            form: providerResult.form,
        },
    };
}