import {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    completeCashPayment,
} from "../services/complete-cash-payment.service.js";

export async function completeCashPaymentController(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {

        const paymentId = req.params.paymentId;

        if (!paymentId || typeof paymentId !== "string") {
            return res.status(400).json({
                error: {
                    code: "INVALID_REQUEST",
                    message:
                        "paymentId is required and must be a string.",
                },
            });
        }

        const payment = await completeCashPayment(
            paymentId,
        );

        return res.status(200).json({
            data: payment,
        });
    } catch (error) {
        return next(error);
    }
}