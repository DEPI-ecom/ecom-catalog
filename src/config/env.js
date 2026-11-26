
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3002),
    NODE_ENV: z.enum([
        "development",
        "test",
        "production"
    ]).default("development"),
    DATABASE_URL: z.string().min(1)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Invalid environment configuration:");
    console.error(result.error.flatten());
    process.exit(1);
}

export const env = result.data;
