import { prisma } from "../../../../db/prisma.js";

import {
    PaymentMethod,
    PaymentStatus,
} from "../../../../generated/prisma/client.js";

import {
    completePayment,
} from "./payment-completion.service.js";

export async function completeCashPayment(
    paymentId: string,
) {
    /*
     * This is only a quick validation before
     * calling the shared completion logic.
     */
    const payment = await prisma.payment.findUnique({
        where: {
            id: paymentId,
        },
        select: {
            id: true,
            method: true,
            status: true,
        },
    });

    if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
    }

    if (payment.method !== PaymentMethod.CASH) {
        throw new Error("PAYMENT_METHOD_NOT_CASH");
    }

    return completePayment({
        paymentId,
    });
}