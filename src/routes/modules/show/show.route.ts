import {Router } from 'express';
import { listShows } from './show.controller.js';

const router = Router();

router.get("/movies/:movieId/shows", listShows);

export default router;