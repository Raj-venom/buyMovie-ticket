import {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    processEsewaSuccess,
} from "../services/esewa-success.service.js";
import { processEsewaFailure } from "../services/esewa-failure.service.js";

export async function esewaSuccessController(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const data =
            req.query.data;

        if (
            typeof data !== "string" ||
            !data
        ) {
            return res.status(400).json({
                error: {
                    code:
                        "ESEWA_CALLBACK_DATA_MISSING",

                    message:
                        "Missing eSewa callback data",
                },
            });
        }

        const result =
            await processEsewaSuccess({
                data,
            });

        return res.status(200).json({
            data: result,
        });
    } catch (error) {
        return next(error);
    }
}


export async function esewaFailureController(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const transactionUuid =
            typeof req.query.transaction_uuid ===
                "string"
                ? req.query.transaction_uuid
                : undefined;


        const result =
            await processEsewaFailure({
                transactionUuid,
            });

        return res.status(200).json({
            data: result,
        });
    } catch (error) {
        return next(error);
    }
}