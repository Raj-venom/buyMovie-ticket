import {
    Request,
    Response,
} from "express";

import {
    failPaymentAttempt,
} from "../services/payment-failure.service.js";


export async function esewaFailureController(
    req: Request,
    res: Response,
) {

    const transactionUuid =
        req.query.transaction_uuid as
        string | undefined;


    /*
     * Some failure scenarios may redirect
     * without a transaction UUID.
     */
    if (!transactionUuid) {

        return res.status(200).json({
            data: {
                status: "FAILED",

                message:
                    "Payment was not completed. " +
                    "You can retry your payment.",
            },
        });
    }


    const result =
        await failPaymentAttempt({
            transactionUuid,

            providerStatus:
                "FAILED",
        });


    return res.status(200).json({
        data: {
            status: "FAILED",

            ...result,

            message:
                "Payment was not completed. " +
                "You can retry your payment.",
        },
    });
}
