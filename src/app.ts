import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoute from './routes/health.route.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

import apiRoutes from "./routes/index.js";

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    service: 'movie-booking-system',
    version: '1.0.0',
    status: 'running',
  });
});

app.use('/health', healthRoute);
app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;