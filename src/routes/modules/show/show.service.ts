import { prisma } from "../../../db/prisma.js";

export async function getShowsByMovie(
    movieId: string,
    date?: string,
) {
    const start = date ? new Date(`${date}T00:00:00`) : undefined;

    const end = date
        ? new Date(`${date}T23:59:59.999`)
        : undefined;

    return await prisma.show.findMany({
        where: {
            movieId,
            status: "SCHEDULED",
            ...(
                start && end ? {
                    startTime: {
                        gte: start,
                        lte: end
                    }
                } : {}
            ),

        },
        include: {
            screen: {
                include: {
                    theater: true,
                }
            }
        },

        orderBy: {
            startTime: "asc"
        }
    })

}