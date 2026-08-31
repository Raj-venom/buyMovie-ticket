
import { prisma } from "../../../../db/prisma.js";

import {
    PaymentStatus,
} from "../../../../generated/prisma/client.js";
import { verifyEsewaTransaction } from "../providers/esewa/esewa.verification.js";

interface HandleEsewaFailureInput {
    transactionUuid: string;
}


interface FailPaymentAttemptInput {
    transactionUuid: string;
    providerStatus?: string;
}


export async function failPaymentAttempt(
    input: FailPaymentAttemptInput,
) {

    const attempt =
        await prisma.paymentAttempt.findFirst({
            where: {
                transactionUuid:
                    input.transactionUuid,
            },

            include: {
                payment: true,
            },
        });


    /*
     * We don't know about this transaction.
     */
    if (!attempt) {
        throw new Error(
            "PAYMENT_ATTEMPT_NOT_FOUND",
        );
    }


    /*
     * Idempotency.
     *
     * The failure URL may be hit more than once.
     */
    if (
        attempt.status ===
        PaymentStatus.FAILED
    ) {
        return {
            alreadyFailed: true,
            paymentId: attempt.paymentId,
        };
    }


    /*
     * Never change a successful attempt.
     */
    if (
        attempt.status ===
        PaymentStatus.SUCCESS
    ) {
        return {
            alreadyCompleted: true,
            paymentId: attempt.paymentId,
        };
    }


    /*
     * Mark only this attempt as failed.
     *
     * IMPORTANT:
     *
     * We do NOT mark the main Payment as FAILED.
     *
     * The customer may retry using another
     * PaymentAttempt while the reservation
     * is still active.
     */
    await prisma.paymentAttempt.update({
        where: {
            id: attempt.id,
        },

        data: {
            status:
                PaymentStatus.FAILED,

            providerStatus:
                input.providerStatus ??
                "FAILED",

            completedAt:
                new Date(),
        },
    });


    return {
        alreadyFailed: false,
        paymentId: attempt.paymentId,
    };
}


export async function handleEsewaFailure(
    input: HandleEsewaFailureInput,
) {

    return prisma.$transaction(
        async (tx) => {

            const attempt =
                await tx.paymentAttempt.findFirst({
                    where: {
                        transactionUuid:
                            input.transactionUuid,
                    },

                    include: {
                        payment: true,
                    },
                });


            if (!attempt) {
                throw new Error(
                    "PAYMENT_ATTEMPT_NOT_FOUND",
                );
            }


            /*
             * Idempotency.
             *
             * If the transaction was already completed,
             * never change it back to FAILED/CANCELLED.
             */
            if (
                attempt.status ===
                PaymentStatus.SUCCESS
            ) {
                return {
                    alreadyCompleted: true,

                    paymentId:
                        attempt.paymentId,

                    attemptStatus:
                        attempt.status,
                };
            }


            /*
             * We need the authoritative amount
             * stored in our database.
             */
            const amount =
                attempt.amount.toString();


            /*
             * Ask eSewa what actually happened.
             *
             * The browser redirect itself is not
             * considered authoritative.
             */
            const providerStatus =
                await verifyEsewaTransaction(
                    input.transactionUuid,
                    amount,
                );


            /*
             * COMPLETE
             *
             * This is important.
             *
             * A user may arrive at our failure URL
             * while eSewa has actually completed
             * the transaction.
             *
             * We should NOT mark it failed.
             */
            if (
                providerStatus.status ===
                "COMPLETE"
            ) {

                return {
                    paymentId:
                        attempt.paymentId,

                    attemptId:
                        attempt.id,

                    providerStatus:
                        providerStatus.status,

                    shouldComplete: true,

                    providerReference:
                        providerStatus.ref_id,
                };
            }


            /*
             * PENDING
             *
             * Keep our attempt pending.
             */
            if (
                providerStatus.status ===
                "PENDING"
            ) {

                await tx.paymentAttempt.update({
                    where: {
                        id: attempt.id,
                    },

                    data: {
                        providerStatus:
                            providerStatus.status,

                        providerResponse:
                            providerStatus,

                    },
                });


                return {
                    paymentId:
                        attempt.paymentId,

                    attemptId:
                        attempt.id,

                    providerStatus:
                        providerStatus.status,

                    shouldComplete: false,

                    pending: true,
                };
            }


            /*
             * CANCELED
             */
            if (
                providerStatus.status ===
                "CANCELED"
            ) {

                await tx.paymentAttempt.update({
                    where: {
                        id: attempt.id,
                    },

                    data: {
                        status:
                            PaymentStatus.CANCELLED,

                        providerStatus:
                            providerStatus.status,

                        providerReference:
                            providerStatus.ref_id,

                        providerResponse:
                            providerStatus,

                        completedAt:
                            new Date(),
                    },
                });


                return {
                    paymentId:
                        attempt.paymentId,

                    attemptId:
                        attempt.id,

                    providerStatus:
                        providerStatus.status,

                    shouldComplete: false,

                    cancelled: true,
                };
            }


            /*
             * NOT_FOUND
             *
             * eSewa says the transaction was
             * terminated / session expired.
             */
            if (
                providerStatus.status ===
                "NOT_FOUND"
            ) {

                await tx.paymentAttempt.update({
                    where: {
                        id: attempt.id,
                    },

                    data: {
                        status:
                            PaymentStatus.FAILED,

                        providerStatus:
                            providerStatus.status,

                        providerResponse:
                            providerStatus,

                        completedAt:
                            new Date(),
                    },
                });


                return {
                    paymentId:
                        attempt.paymentId,

                    attemptId:
                        attempt.id,

                    providerStatus:
                        providerStatus.status,

                    shouldComplete: false,

                    failed: true,
                };
            }


            /*
             * AMBIGUOUS
             *
             * Don't make a dangerous decision.
             */
            if (
                providerStatus.status ===
                "AMBIGUOUS"
            ) {

                await tx.paymentAttempt.update({
                    where: {
                        id: attempt.id,
                    },

                    data: {
                        providerStatus:
                            providerStatus.status,

                        providerResponse:
                            providerStatus,
                    },
                });


                return {
                    paymentId:
                        attempt.paymentId,

                    attemptId:
                        attempt.id,

                    providerStatus:
                        providerStatus.status,

                    shouldComplete: false,

                    ambiguous: true,
                };
            }


            /*
             * Refund statuses shouldn't occur
             * during initial payment.
             *
             * Keep the attempt unchanged but
             * record the provider response.
             */
            await tx.paymentAttempt.update({
                where: {
                    id: attempt.id,
                },

                data: {
                    providerStatus:
                        providerStatus.status,

                    providerResponse:
                        providerStatus,
                },
            });


            return {
                paymentId:
                    attempt.paymentId,

                attemptId:
                    attempt.id,

                providerStatus:
                    providerStatus.status,

                shouldComplete: false,
            };
        },
        {
            maxWait: 10_000,
            timeout: 10_000,
        },
    );
}