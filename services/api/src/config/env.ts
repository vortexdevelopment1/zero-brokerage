import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  HOST: z.string().min(1).default("0.0.0.0"),

  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      "postgresql://postgres:postgres@localhost:5432/zero_brokerage_dev",
    ),

  JWT_SECRET: z
    .string()
    .min(16)
    .default("zero-brokerage-dev-secret-key-at-least-32-chars-long"),

  ACCESS_TOKEN_EXPIRY_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(30),

  OTP_EXPIRY_SECONDS: z.coerce.number().int().positive().default(300),

  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),

  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

  REDIS_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
