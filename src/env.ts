import z from "zod";

const envSchema = z.object({
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3333),
});

export const env = envSchema.parse(process.env);
