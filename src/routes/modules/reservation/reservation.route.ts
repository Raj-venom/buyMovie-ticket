import { Router } from "express";

import {
    createReservationController,
    getReservationController,
} from "./reservation.controller.js";

const router = Router();

router.post(
    "/",
    createReservationController,
);

router.get(
    "/:reservationId",
    getReservationController,
);

export default router;