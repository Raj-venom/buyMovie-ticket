import { prisma } from "../../../../db/prisma.js";

import {
    PaymentStatus,
} from "../../../../generated/prisma/client.js";

interface EsewaFailureInput {
    transactionUuid?: string;
}

export async function processEsewaFailure(
    input: EsewaFailureInput,
) {
    /*
     * Sometimes a provider failure redirect may not
     * contain enough transaction information.
     *
     * In that case, do not change any local records.
     */
    if (!input.transactionUuid) {
        return {
            updated: false,
            reason: "TRANSACTION_UUID_MISSING",
        };
    }

    const attempt =
        await prisma.paymentAttempt.findUnique({
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
     * Never modify an already successful payment.
     *
     * This makes the endpoint safe if callbacks
     * arrive out of order.
     */
    if (
        attempt.payment.status ===
        PaymentStatus.SUCCESS
    ) {
        return {
            updated: false,
            alreadyCompleted: true,
        };
    }

    /*
     * Mark only this attempt as failed.
     *
     * Do NOT mark the whole Payment as FAILED yet.
     * The user may retry with another attempt.
     */
    if (
        attempt.status ===
        PaymentStatus.PENDING ||
        attempt.status ===
        PaymentStatus.PROCESSING
    ) {
        await prisma.paymentAttempt.update({
            where: {
                id: attempt.id,
            },
            data: {
                status: PaymentStatus.FAILED,
                providerStatus: "FAILED",
                completedAt: new Date(),
            },
        });
    }

    return {
        updated: true,
        paymentId: attempt.paymentId,
        reservationId: attempt.payment.reservationId,
    };
}