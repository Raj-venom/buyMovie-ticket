import { prisma } from "../../../../db/prisma.js";

import {
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
} from "../../../../generated/prisma/client.js";

import {
    verifyEsewaTransaction,
} from "../providers/esewa/esewa.verification.js";

import {
    completePayment,
} from "./payment-completion.service.js";


interface CompleteEsewaPaymentInput {
    transactionUuid: string;
}


export async function completeEsewaPayment(
    input: CompleteEsewaPaymentInput,
) {

    /*
     * Find the payment attempt using the
     * transaction UUID returned by eSewa.
     */
    const attempt =
        await prisma.paymentAttempt.findUnique({
            where: {
                transactionUuid:input.transactionUuid,
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

    const payment =
        attempt.payment;

    /*
     * Make sure this is actually an eSewa payment.
     */
    if (
        payment.method !==
            PaymentMethod.WALLET ||
        payment.provider !==
            PaymentProvider.ESEWA
    ) {
        throw new Error(
            "INVALID_ESEWA_PAYMENT",
        );
    }

    /*
     * Idempotency.
     *
     * eSewa may redirect more than once.
     */
    if (
        payment.status ===
        PaymentStatus.SUCCESS
    ) {
        const booking =
            await prisma.booking.findUnique({
                where: {
                    paymentId: payment.id,
                },
            });

        if (!booking) {
            throw new Error(
                "BOOKING_NOT_FOUND",
            );
        }

        return booking;
    }

    /*
     * Ask eSewa directly for the real
     * transaction status.
     *
     * Do not trust the browser redirect alone.
     */
    const verification =
        await verifyEsewaTransaction(
            input.transactionUuid,
            payment.amount.toString(),
        );

    /*
     * Verify that eSewa confirms success.
     */
    if (
        verification.status !==
        "COMPLETE"
    ) {
        throw new Error(
            "ESEWA_PAYMENT_NOT_COMPLETE",
        );
    }

    /*
     * Extra safety checks.
     */
    if (
        verification.transaction_uuid !==
        input.transactionUuid
    ) {
        throw new Error(
            "ESEWA_TRANSACTION_MISMATCH",
        );
    }

    if (
        verification.product_code !==
        (process.env.ESEWA_PRODUCT_CODE ??
            "EPAYTEST")
    ) {
        throw new Error(
            "ESEWA_PRODUCT_CODE_MISMATCH",
        );
    }

    if (
        Number(verification.total_amount) !==
        Number(payment.amount)
    ) {
        throw new Error(
            "ESEWA_AMOUNT_MISMATCH",
        );
    }

    /*
     * eSewa has confirmed the payment.
     *
     * Now use our shared service to atomically:
     *
     * - Create booking
     * - Create booking seats
     * - Mark seats BOOKED
     * - Complete reservation
     * - Mark payment SUCCESS
     * - Mark attempt SUCCESS
     */
    return completePayment({
        paymentId: payment.id,

        transactionUuid:
            input.transactionUuid,

        providerReference:
            verification.ref_id,
    });
}