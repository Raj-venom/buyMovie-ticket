import {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    processEsewaSuccess,
} from "../services/esewa-success.service.js";

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