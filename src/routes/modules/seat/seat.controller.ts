import type { Request, Response, NextFunction } from "express";
import { getSeatMap } from "./seat.service.js";
import { success } from "../../../utils/api-response.js";


export async function getSeats(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        const { showId } = req.params;

        if (!showId || typeof showId !== "string") {
            throw new Error("Invalid showId parameter");
        }

        const seats = await getSeatMap(showId);

        return success(res, seats);

    } catch (error) {
        return next(error);
    }
}