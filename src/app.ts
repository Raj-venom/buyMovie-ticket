import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from "node:path";
import { fileURLToPath } from "node:url";

import healthRoute from './routes/health.route.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

import apiRoutes from "./routes/index.js";

const app = express();

app.set('trust proxy', 1);

// app.use(helmet());

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],

                baseUri: ["'self'"],

                fontSrc: [
                    "'self'",
                    "https:",
                    "data:",
                ],

                formAction: [
                    "'self'",
                    "https://rc-epay.esewa.com.np",
                ],

                frameAncestors: ["'self'"],

                imgSrc: [
                    "'self'",
                    "data:",
                ],

                objectSrc: ["'none'"],

                scriptSrc: ["'self'"],

                scriptSrcAttr: ["'none'"],

                styleSrc: [
                    "'self'",
                    "https:",
                    "'unsafe-inline'",
                ],

                upgradeInsecureRequests: [],
            },
        },
    }),
);
app.use(cors());
app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  express.static("public")
);


// log the request method and URL for each incoming request
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve test frontend
app.use(express.static(path.join(__dirname, "../public")));

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