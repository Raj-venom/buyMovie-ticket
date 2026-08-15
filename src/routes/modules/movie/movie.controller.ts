import type { Request, Response, NextFunction } from "express";
import { getMovies } from "./movie.service.js";
import { success } from "../../../utils/api-response.js";

export async function listMovies(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const movies = await getMovies();

    return success(res, movies);
  } catch (err) {
    return next(err);
  }
}