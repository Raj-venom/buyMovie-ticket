import type {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    createReservation,
    getReservation,
} from "./reservation.service.js";

import {
    createReservationSchema,
} from "./reservation.schema.js";

import { success } from "../../../utils/api-response.js";

export async function createReservationController(
    req: Request,
    res: Response,
    next: NextFunction,
) {

    try {

        const input = createReservationSchema.parse(req.body);

        const reservation = await createReservation(input);

        return success(
            res,
            reservation,
            201,
        );

    } catch (error) {
        return next(error);
    }
}



export async function getReservationController(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {

        const reservationId = req.params.reservationId

        if (!reservationId || reservationId !== "") {
            return next(new Error("Reservation ID is required"));
        }

        const reservation =
            await getReservation(
                reservationId,
            );

        return success(res, reservation);
    } catch (error) {
        return next(error);
    }
}