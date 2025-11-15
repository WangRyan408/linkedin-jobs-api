import type { Config } from "drizzle-kit";

export default {
  schema: "./src/models/schema.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH || "./linkedin_jobs.db",
  },
} satisfies Config;
