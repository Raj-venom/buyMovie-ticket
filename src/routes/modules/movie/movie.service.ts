import { prisma } from "../../../db/prisma.js";

export async function getMovies() {
    return await prisma.movie.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            title: "asc"
        },
    });
}