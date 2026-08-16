import { z } from "zod";

export const createReservationSchema = z.object({
    showId: z.string().uuid(),

    guest: z.object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters")
            .max(100),

        phone: z
            .string()
            .trim()
            .min(7)
            .max(20),
    }),

    seatIds: z
        .array(z.string().uuid())
        .min(1, "At least one seat is required")
        .max(10, "Maximum 10 seats can be reserved")
        .refine(
            (seats) => new Set(seats).size === seats.length,
            {
                message: "Duplicate seats are not allowed",
            },
        ),
});

export type CreateReservationInput =
    z.infer<typeof createReservationSchema>;