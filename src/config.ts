import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3025),
  PUBLIC_BASE_URL: z.string().url(),
  MONGO_DATABASE_URL: z.string().min(1),
  MONGO_DATABASE_NAME: z.string().default("agulhada_mail"),
  AWS_REGION: z.string().default("sa-east-1"),
  SES_FROM_EMAIL: z.string().email(),
  SES_FROM_NAME: z.string().default("Agulhada.com"),
  SES_CONFIGURATION_SET: z.string().default("agulhada-mail"),
  API_ADMIN_TOKEN: z.string().min(12),
  UNSUBSCRIBE_SECRET: z.string().min(24),
  SNS_WEBHOOK_SECRET: z.string().min(12),
  WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(5000),
  SEND_RATE_PER_SECOND: z.coerce.number().positive().default(5)
});

export const config = schema.parse(process.env);
