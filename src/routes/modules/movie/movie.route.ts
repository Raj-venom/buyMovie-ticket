import {Router} from "express";
import { listMovies } from "./movie.controller.js";

const router = Router();

router.get("/", listMovies);

export default router;