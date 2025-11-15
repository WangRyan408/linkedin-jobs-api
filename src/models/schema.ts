import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobUrl: text("job_url").notNull(),
  jobBaseUrl: text("job_base_url").notNull().unique(),
  position: text("position").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  date: text("date").notNull(),
  salary: text("salary").notNull(),
  companyLogo: text("company_logo").notNull(),
  agoTime: text("ago_time").notNull(),
  firstSeen: integer("first_seen", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastSeen: integer("last_seen", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type JobRecord = typeof jobs.$inferSelect;
export type NewJobRecord = typeof jobs.$inferInsert;


