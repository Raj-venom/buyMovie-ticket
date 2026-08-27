
import { prisma } from "../../../../db/prisma.js";

import {
    PaymentStatus,
} from "../../../../generated/prisma/client.js";


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
