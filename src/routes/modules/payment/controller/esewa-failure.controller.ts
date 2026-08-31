// import {
//     Request,
//     Response,
// } from "express";

// import {
//     failPaymentAttempt,
// } from "../services/payment-failure.service.js";


// export async function esewaFailureController(
//     req: Request,
//     res: Response,
// ) {

//     const transactionUuid =
//         req.query.transaction_uuid as
//         string | undefined;


//     /*
//      * Some failure scenarios may redirect
//      * without a transaction UUID.
//      */
//     if (!transactionUuid) {

//         return res.status(200).json({
//             data: {
//                 status: "FAILED",

//                 message:
//                     "Payment was not completed. " +
//                     "You can retry your payment.",
//             },
//         });
//     }


//     const result =
//         await failPaymentAttempt({
//             transactionUuid,

//             providerStatus:
//                 "FAILED",
//         });


//     return res.status(200).json({
//         data: {
//             status: "FAILED",

//             ...result,

//             message:
//                 "Payment was not completed. " +
//                 "You can retry your payment.",
//         },
//     });
// }



import {
    Request,
    Response,
} from "express";
import { handleEsewaFailure } from "../services/payment-failure.service.js";
import { completePayment } from "../services/payment-completion.service.js";


export async function esewaFailureController(
    req: Request,
    res: Response,
) {

    try {

        const transactionUuid =
            req.query.transaction_uuid as
            string | undefined;


        /*
         * We cannot reconcile without the
         * transaction UUID.
         */
        if (!transactionUuid) {

            return res.status(400).json({
                error: {
                    code:
                        "TRANSACTION_UUID_REQUIRED",

                    message:
                        "Transaction UUID is required",
                },
            });
        }


        const result =
            await handleEsewaFailure({
                transactionUuid,
            });


        /*
         * eSewa says the transaction actually
         * completed.
         *
         * Reuse the existing completion service.
         */
        if (
            result.shouldComplete
        ) {

            const booking =
                await completePayment({
                    paymentId:
                        result.paymentId,

                    transactionUuid,

                    providerReference:
                        result.providerReference,
                });


            return res.status(200).json({
                data: {
                    alreadyCompleted: false,

                    booking,
                },
            });
        }


        /*
         * Payment is still pending.
         */
        if (result.pending) {

            return res.status(200).json({
                data: {
                    status:
                        "PENDING",

                    paymentId:
                        result.paymentId,

                    message:
                        "Payment is still pending. " +
                        "Please check again later.",
                },
            });
        }


        /*
         * User cancelled / eSewa cancelled.
         */
        if (result.cancelled) {

            return res.status(200).json({
                data: {
                    status:
                        "CANCELLED",

                    paymentId:
                        result.paymentId,

                    message:
                        "Payment was cancelled. " +
                        "You can retry the payment.",
                },
            });
        }


        /*
         * Transaction expired / wasn't found.
         */
        if (result.failed) {

            return res.status(200).json({
                data: {
                    status:
                        "FAILED",

                    paymentId:
                        result.paymentId,

                    message:
                        "Payment was not completed. " +
                        "You can retry the payment.",
                },
            });
        }


        /*
         * Ambiguous transaction.
         */
        if (result.ambiguous) {

            return res.status(200).json({
                data: {
                    status:
                        "AMBIGUOUS",

                    paymentId:
                        result.paymentId,

                    message:
                        "Payment status could not " +
                        "be determined yet.",
                },
            });
        }


        return res.status(200).json({
            data: {
                status:
                    result.providerStatus,

                paymentId:
                    result.paymentId,
            },
        });

    } catch (error) {

        console.error(
            "eSewa failure handling error:",
            error,
        );

        return res.status(500).json({
            error: {
                code:
                    "ESEWA_FAILURE_HANDLING_FAILED",

                message:
                    "Unable to process eSewa payment status",
            },
        });
    }
}