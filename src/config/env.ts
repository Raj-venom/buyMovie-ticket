import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  RESERVATION_TIMEOUT_MINUTES: z.coerce.number().default(10),
  SEATMAP_CACHE_TTL_SECONDS: z.coerce.number().default(30),
});

export const env = envSchema.parse(process.env);