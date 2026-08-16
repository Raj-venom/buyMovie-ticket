import {Router} from "express";
import { getSeats } from "./seat.controller.js";

const router = Router();

router.get("/shows/:showId/seats", getSeats);

export default router;