import { Router } from "express";

import movieRoute from "./modules/movie/movie.route.js";
import showRoute from "./modules/show/show.route.js";
import seatRoute from "./modules/seat/seat.route.js";
import reservationRoute from "./modules/reservation/reservation.route.js";



const router = Router();

router.use("/movies", movieRoute);
router.use("/", showRoute);
router.use("/", seatRoute);
router.use("/reservations", reservationRoute);

export default router;