import { prisma } from "../../../../db/prisma.js";

import { PaymentStatus } from "../../../../generated/prisma/client.js";

import { verifyEsewaCallback } from "../providers/esewa/esewa.callback.js";
import { verifyEsewaTransaction } from "../providers/esewa/esewa.verification.js";
import { completePayment } from "./payment-completion.service.js";

interface EsewaSuccessInput {
    data: string;
}

export async function processEsewaSuccess(
    input: EsewaSuccessInput,
) {
    /*
     * Decode the Base64 response sent by eSewa.
     */
    const decoded = Buffer.from(
        input.data,
        "base64",
    ).toString("utf8");

    const payload = JSON.parse(decoded);

    /*
     * Verify the callback signature.
     *
     * Do not trust data coming from the browser.
     */
    const isValidSignature =
        verifyEsewaCallback(payload);

    if (!isValidSignature) {
        throw new Error(
            "INVALID_ESEWA_SIGNATURE",
        );
    }

    /*
     * Find our local payment attempt.
     */
    const attempt =
        await prisma.paymentAttempt.findUnique({
            where: {
                transactionUuid:
                    payload.transaction_uuid,
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
     * If this payment was already completed,
     * do not create another booking.
     */
    if (
        attempt.payment.status ===
        PaymentStatus.SUCCESS
    ) {
        return {
            alreadyCompleted: true,
            paymentId: attempt.payment.id,
        };
    }

    /*
     * Verify the transaction directly with eSewa.
     *
     * The callback is NOT the source of truth.
     * eSewa's verification API is.
     */
    const verification =
        await verifyEsewaTransaction(
            payload.transaction_uuid,
            attempt.amount.toString(),
        );

    /*
     * Store what eSewa told us.
     */
    await prisma.paymentAttempt.update({
        where: {
            id: attempt.id,
        },

        data: {
            providerStatus:
                verification.status,

            providerReference:
                verification.ref_id,

            providerResponse:
                verification,

            providerTransactionId:
                verification.ref_id ?? null,
        },
    });

    /*
     * Only COMPLETE means successful payment.
     */
    if (verification.status !== "COMPLETE") {
        throw new Error(
            "ESEWA_PAYMENT_NOT_COMPLETED",
        );
    }

    /*
     * Complete our local payment.
     *
     * This creates:
     * - Booking
     * - BookingSeats
     * - Payment SUCCESS
     * - Reservation COMPLETED
     * - ShowSeats BOOKED
     */
    const booking =
        await completePayment({
            paymentId: attempt.paymentId,

            transactionUuid:
                payload.transaction_uuid,

            providerReference:
                verification.ref_id,
        });

    return {
        alreadyCompleted: false,
        booking,
    };
}