import type { Request, Response, NextFunction } from "express";
import { getShowsByMovie } from "./show.service.js";
import { success } from "../../../utils/api-response.js";

export async function listShows(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        const { movieId } = req.params ;

        if (!movieId || typeof movieId !== "string") {
            throw new Error("Invalid movieId parameter");
        }

        const date =
            typeof req.query.date === "string"
                ? req.query.date
                : undefined;

        const shows = await getShowsByMovie(movieId, date);

        return success(res, shows);
    }
    catch (error) {
        return next(error);
    }
}