import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { jobs, type JobRecord, type NewJobRecord } from "./schema.js";
import type { Job } from "../types.js";

export class JobDatabase {
  private static instance: JobDatabase | null = null;
  private sqlite: Database;
  private db: BunSQLiteDatabase;
  private writeQueue: Promise<void>;
  private queueDepth: number;
  private maxRetries: number;

  private constructor(dbPath: string = "./linkedin_jobs.db") {
    this.sqlite = new Database(dbPath, { create: true });
    this.db = drizzle(this.sqlite);
    this.writeQueue = Promise.resolve();
    this.queueDepth = 0;
    this.maxRetries = parseInt(process.env.MAX_WRITE_RETRIES || "3", 10);
    this.initialize();
  }

  static getInstance(dbPath?: string): JobDatabase {
    if (!JobDatabase.instance) {
      const path = dbPath || process.env.DATABASE_PATH || "./linkedin_jobs.db";
      JobDatabase.instance = new JobDatabase(path);
    }
    return JobDatabase.instance;
  }

  private initialize(): void {
    const autoMigrate = process.env.AUTO_MIGRATE !== "false";
    if (autoMigrate) {
      try {
        migrate(this.db, { migrationsFolder: "./src/migrations" });
        console.log("✓ Database migrations applied successfully");
      } catch (error) {
        console.error("✗ Migration failed:", error instanceof Error ? error.message : "Unknown error");
        throw error;
      }
    }
  }

  async filterNewJobs(jobsToFilter: Job[]): Promise<Job[]> {
    if (jobsToFilter.length === 0) {
      return [];
    }

    try {
      // Helper function to extract base URL without query parameters
      const getBaseUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname;
        } catch {
          // If URL parsing fails, return as-is
          return url.split('?')[0];
        }
      };

      const existingBaseUrls = new Set<string>();

      // Get all base URLs from database once
      const results = this.db
        .select({ jobBaseUrl: jobs.jobBaseUrl })
        .from(jobs)
        .all();

      // Build set of existing base URLs
      results.forEach((row) => existingBaseUrls.add(row.jobBaseUrl));

      const newJobs = jobsToFilter.filter((job) => !existingBaseUrls.has(getBaseUrl(job.jobUrl)));
      console.log(`📊 Database check: ${newJobs.length} new jobs, ${existingBaseUrls.size} already tracked`);
      
      return newJobs;
    } catch (error) {
      console.error("✗ Error filtering jobs:", error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }

  async batchInsertJobs(jobsToInsert: Job[]): Promise<void> {
    if (jobsToInsert.length === 0) {
      return;
    }

    return this.enqueueWrite(async () => {
      // Helper function to extract base URL
      const getBaseUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname;
        } catch {
          return url.split('?')[0];
        }
      };

      const now = new Date();
      
      // Deduplicate within the batch by base URL (keep first occurrence)
      const seenBaseUrls = new Set<string>();
      const uniqueJobs = jobsToInsert.filter((job) => {
        const baseUrl = getBaseUrl(job.jobUrl);
        if (seenBaseUrls.has(baseUrl)) {
          return false;
        }
        seenBaseUrls.add(baseUrl);
        return true;
      });

      const records: NewJobRecord[] = uniqueJobs.map((job) => ({
        jobUrl: job.jobUrl,
        jobBaseUrl: getBaseUrl(job.jobUrl),
        position: job.position,
        company: job.company,
        location: job.location,
        date: job.date,
        salary: job.salary,
        companyLogo: job.companyLogo,
        agoTime: job.agoTime,
        firstSeen: now,
        lastSeen: now,
      }));

      await this.db.insert(jobs).values(records);
      const skipped = jobsToInsert.length - uniqueJobs.length;
      if (skipped > 0) {
        console.log(`✓ Inserted ${uniqueJobs.length} new jobs into database (${skipped} duplicates within batch skipped)`);
      } else {
        console.log(`✓ Inserted ${uniqueJobs.length} new jobs into database`);
      }
    });
  }

  private async enqueueWrite(writeOperation: () => Promise<void>): Promise<void> {
    this.queueDepth++;
    console.log(`📝 Write queued (queue depth: ${this.queueDepth})`);

    this.writeQueue = this.writeQueue.then(async () => {
      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          await writeOperation();
          this.queueDepth--;
          console.log(`✓ Write completed (queue depth: ${this.queueDepth})`);
          return;
        } catch (error) {
          attempt++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          if (attempt < this.maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.warn(`⚠ Write failed (attempt ${attempt}/${this.maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            this.queueDepth--;
            console.error(`✗ Write failed after ${this.maxRetries} attempts: ${errorMessage}`);
            throw error;
          }
        }
      }
    });

    return this.writeQueue;
  }

  getQueueDepth(): number {
    return this.queueDepth;
  }

  getAllJobs(): JobRecord[] {
    return this.db.select().from(jobs).all();
  }

  close(): void {
    this.sqlite.close();
  }
}
