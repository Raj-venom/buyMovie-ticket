import type { Request, Response } from "express";

import {
    PaymentMethod,
    PaymentProvider,
} from "../../../../generated/prisma/browser.js";


import {
    verifyEsewaTransaction,
} from "../providers/esewa/esewa.verification.js";

import {
    completePayment,
} from "../services/payment-completion.service.js";

import { prisma } from "../../../../db/prisma.js";
import { decodeEsewaResponse } from "../providers/esewa.provider.js";
import { verifyEsewaCallback } from "../providers/esewa/esewa.callback.js";
import { createPayment } from "../services/payment.service.js";

export async function createPaymentController(
    req: Request,
    res: Response,
) {

    const { reservationId } = req.params;

    const {
        method,
        provider,
    } = req.body;

    if (!reservationId) {
        return res.status(400).json({
            error: {
                code: "INVALID_REQUEST",
                message:
                    "reservationId is required.",
            },
        });
    }

    if (!method) {
        return res.status(400).json({
            error: {
                code: "INVALID_REQUEST",
                message:
                    "Payment method is required.",
            },
        });
    }

    try {

        const result =
            await createPayment({
                reservationId,
                method:
                    method as PaymentMethod,

                provider:
                    provider as
                    | PaymentProvider
                    | undefined,
            });

        return res.status(201).json({
            data: result,
        });

    } catch (error) {

        if (
            error instanceof Error
        ) {

            const statusMap: Record<
                string,
                number
            > = {

                RESERVATION_NOT_FOUND: 404,

                RESERVATION_NOT_ACTIVE: 409,

                RESERVATION_EXPIRED: 409,

                SEATS_NOT_RESERVED: 409,

                PAYMENT_ALREADY_COMPLETED: 409,

                CASH_NOT_ALLOWED: 400,

                INVALID_PAYMENT_PROVIDER: 400,
            };

            const status =
                statusMap[error.message];

            if (status) {
                return res.status(status).json({
                    error: {
                        code:
                            error.message,

                        message:
                            error.message
                                .replaceAll(
                                    "_",
                                    " ",
                                ),
                    },
                });
            }
        }

        throw error;
    }
}


export async function esewaSuccessController_old(
    req: Request,
    res: Response,
) {

    try {

        const data =
            req.query.data;

        if (
            typeof data !== "string"
        ) {
            return res.status(400).json({
                error: {
                    code:
                        "INVALID_ESEWA_RESPONSE",
                },
            });
        }

        /*
         * Decode Base64 response.
         */
        const callback =
            decodeEsewaResponse(
                data,
            );

        /*
         * Verify eSewa signature.
         */
        const valid =
            verifyEsewaCallback(
                callback,
            );

        if (!valid) {
            return res.status(400).json({
                error: {
                    code:
                        "INVALID_ESEWA_SIGNATURE",
                },
            });
        }

        /*
         * Find payment attempt.
         */
        const attempt =
            await prisma.paymentAttempt.findFirst({
                where: {
                    transactionUuid:
                        callback.transaction_uuid,
                },

                include: {
                    payment: true,
                },
            });

        if (!attempt) {
            return res.status(404).json({
                error: {
                    code:
                        "PAYMENT_ATTEMPT_NOT_FOUND",
                },
            });
        }

        /*
         * Verify directly with eSewa.
         */
        const verification =
            await verifyEsewaTransaction(
                callback.transaction_uuid,
                callback.total_amount,
            );

        /*
         * Store provider response
         * for reconciliation/debugging.
         */
        await prisma.paymentAttempt.update({
            where: {
                id: attempt.id,
            },

            data: {
                providerResponse:
                    verification as any,

                providerStatus:
                    verification.status,

                providerReference:
                    verification.ref_id,
            },
        });

        /*
         * Only COMPLETE is a successful payment.
         */
        if (
            verification.status !==
            "COMPLETE"
        ) {

            return res.status(409).json({
                error: {
                    code:
                        "PAYMENT_NOT_COMPLETE",

                    status:
                        verification.status,
                },
            });
        }

        /*
         * IMPORTANT:
         *
         * Verify amount and transaction UUID
         * before completing booking.
         */
        if (
            verification.transaction_uuid !==
            callback.transaction_uuid
        ) {
            return res.status(400).json({
                error: {
                    code:
                        "TRANSACTION_MISMATCH",
                },
            });
        }

        const paymentAmount =
            Number(
                attempt.payment.amount,
            );

        if (
            Number(
                verification.total_amount,
            ) !== paymentAmount
        ) {
            return res.status(400).json({
                error: {
                    code:
                        "PAYMENT_AMOUNT_MISMATCH",
                },
            });
        }

        /*
         * Atomic booking completion.
         */
        const booking =
            await completePayment({
                paymentId:
                    attempt.paymentId,

                transactionUuid:
                    callback.transaction_uuid,

                providerReference:
                    verification.ref_id,
            });

        return res.status(200).json({
            data: {
                bookingId:
                    booking.id,

                bookingNumber:
                    booking.bookingNumber,

                status:
                    booking.status,
            },
        });

    } catch (error) {

        console.error(
            "eSewa success callback failed:",
            error,
        );

        throw error;
    }
}
