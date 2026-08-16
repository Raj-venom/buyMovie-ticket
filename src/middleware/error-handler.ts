import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { ReservationError } from "../errors/reservation-error.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("🔥 ERROR:", error);

  if (error instanceof ReservationError) {
    const status =
      error.code === "SEAT_UNAVAILABLE"
        ? 409
        : 400;

    return res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : "Something went wrong",
    },
  });
}