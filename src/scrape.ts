import "dotenv/config";
import { load } from "cheerio";
import axios from "axios";
// Keep randomUseragent as CommonJS for Bun compatibility
const randomUseragent = require("random-useragent");

// Import types
import type { QueryOptions, Job, CacheItem } from "./types.js";
import { JobDatabase } from "./models/database.js";

// Re-export types for consumers
export type { QueryOptions, Job } from "./types.js";

// Utility functions
const delay = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

// Cache implementation
export class JobCache {
  private cache: Map<string, CacheItem>;
  private TTL: number;

  constructor() {
    this.cache = new Map();
    this.TTL = 1000 * 60 * 60; // 1 hour
  }

  set(key: string, value: Job[]): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  get(key: string): Job[] | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

const cache = new JobCache();
const jobDb = JobDatabase.getInstance();

// Discord notification helper
async function sendDiscordNotification(jobs: Job[], queryKeyword?: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl || jobs.length === 0) {
    return;
  }

  try {
    // Discord has a limit of 10 embeds per message
    const MAX_EMBEDS_PER_MESSAGE = 10;
    
    for (let i = 0; i < jobs.length; i += MAX_EMBEDS_PER_MESSAGE) {
      const batch = jobs.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
      const embeds = batch.map((job) => ({
        title: job.position,
        url: job.jobUrl,
        description: `**${job.company}**\n📍 ${job.location}`,
        color: 0x0a66c2, // LinkedIn blue
        fields: [
          {
            name: "💰 Salary",
            value: job.salary || "Not specified",
            inline: true,
          },
          {
            name: "📅 Posted",
            value: job.agoTime || job.postDateTime,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      }));

      const payload: any = { embeds };
      if (i === 0) {
        payload.content = `🔔 **${jobs.length} new job${jobs.length > 1 ? "s" : ""} found**${queryKeyword ? ` for "${queryKeyword}"` : ""}`;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`⚠ Discord webhook error: ${response.status} ${response.statusText}`);
      }
      
      // Add delay between batches to avoid rate limits
      if (i + MAX_EMBEDS_PER_MESSAGE < jobs.length) {
        await delay(1000);
      }
    }
    
    console.log(`✓ Sent ${jobs.length} job notification(s) to Discord`);
  } catch (error) {
    console.error("⚠ Failed to send Discord notification:", error instanceof Error ? error.message : "Unknown error");
  }
}

// Query class
class Query {

  private distance: string;
  private host: string;
  private keyword: string;
  private location: string;
  private dateSincePosted: string;
  private jobFunction: string;
  private jobType: string;
  private remoteFilter: string;
  private industry: string;
  private experienceLevel: string;
  private sortBy: string;
  private limit: number;
  private page: number;
  private has_verification: boolean;
  private under_10_applicants: boolean;
  private active?: boolean;
  private refresh?: boolean;

  constructor(queryObj: QueryOptions) {
    this.distance = queryObj.distance || "";
    this.host = queryObj.host || "www.linkedin.com";
    this.keyword = queryObj.keyword?.trim().replace(/\s+/g, "+") || "";
    this.location = queryObj.location?.trim().replace(/\s+/g, "+") || "";
    this.dateSincePosted = queryObj.dateSincePosted || "";
    this.jobType = queryObj.jobType || "";
    this.jobFunction = queryObj.jobFunction || "";
    this.remoteFilter = queryObj.remoteFilter || "";
    this.industry = queryObj.industry || "";
    this.experienceLevel = queryObj.experienceLevel || "";
    this.sortBy = queryObj.sortBy || "R";
    this.limit = Number(queryObj.limit) || 0;
    this.page = Number(queryObj.page) || 0;
    this.has_verification = queryObj.has_verification || false;
    this.under_10_applicants = queryObj.under_10_applicants || false;
    this.refresh = queryObj.refresh || false;
  }

  private getDateSincePosted(): string {
    const dateRange: Record<string, string> = {
      "past month": "r2592000",
      "past week": "r604800",
      "24hr": "r86400",
    };
    return dateRange[this.dateSincePosted.toLowerCase()] || "";
  }

  private getExperienceLevel(): string {
    const experienceRange: Record<string, string> = {
      internship: "1",
      "entry level": "2",
      associate: "3",
      senior: "4",
      director: "5",
      executive: "6",
    };
    return experienceRange[this.experienceLevel.toLowerCase()] || "";
  }

  private getJobType(): string {
    const jobTypeRange: Record<string, string> = {
      "full time": "F",
      "full-time": "F",
      "part time": "P",
      "part-time": "P",
      contract: "C",
      temporary: "T",
      volunteer: "V",
      internship: "I",
    };
    return jobTypeRange[this.jobType.toLowerCase()] || "";
  }

  private getRemoteFilter(): string {
    const remoteFilterRange: Record<string, string> = {
      "on-site": "1",
      "on site": "1",
      remote: "2",
      hybrid: "3",
    };
    return remoteFilterRange[this.remoteFilter.toLowerCase()] || "";
  }

  private getIndustry(): string {
    const industryRange: Record<string, string> = {
      "Marketing": "4",
      "Sales": "5",
      "Business Development": "5",
      "Information Technology": "9",
      "Human Resources": "19",
    };
    return industryRange[this.industry] || "";
  }

 
  // private getDistance(): string {
  //   if (this.distance && parseInt(this.distance) > 0) {
  //     return String(this.distance);
  //   }
  //   return "";
  // }

  private getActiveHiring(): string {
    return this.active ? "true" : "false";
  }

  private getHasVerification(): string {
    return this.has_verification ? "true" : "false";
  }

  private getUnder10Applicants(): string {
    return this.under_10_applicants ? "true" : "false";
  }

  private getRefresh(): string {
    return this.refresh ? "true" : "false";
  }
  private getPage(): number {
    return this.page * 25;
  }

  private url(start: number): string {
    let queryUrl = `https://${this.host}/jobs-guest/jobs/api/seeMoreJobPostings/search?`;

    const params = new URLSearchParams();

    if (this.keyword) params.append("keywords", this.keyword);
    if (this.location) params.append("location", this.location);
    if (this.getDateSincePosted())
      params.append("f_TPR", this.getDateSincePosted());
    // f_SB2 is industry filter not salary
    if (this.getIndustry()) params.append("f_SB2", this.getIndustry());
    if (this.getExperienceLevel())
      params.append("f_E", this.getExperienceLevel());
    if (this.getRemoteFilter()) params.append("f_WT", this.getRemoteFilter());
    if (this.getJobType()) params.append("f_JT", this.getJobType());
    if (this.getHasVerification())
      params.append("f_VJ", this.getHasVerification());
    if (this.getUnder10Applicants())
      params.append("f_EA", this.getUnder10Applicants());
    if (this.distance) params.append("distance", this.distance);
    // The new params
    if (this.getActiveHiring())
      params.append("f_AL", this.getActiveHiring());
    //f_F param (string) - Job Function
    if (this.jobFunction) params.append("f_F", this.jobFunction);
    // Add distance param (int) - search radius in miles
    
    // Add f_JIYN param (bool) - job connections filter
    // Add refresh param (bool) - Refreshes search results
    if (this.getRefresh()) params.append('refresh', this.getRefresh());
    params.append("start", String(start + this.getPage()));

    if (this.sortBy === "recent") params.append("sortBy", "DD");
    else if (this.sortBy === "relevant") params.append("sortBy", "R");

    return queryUrl + params.toString();
  }

  private getCacheKey(): string {
    return `${this.url(0)}_limit:${this.limit}_newOnly`;
  }

  async getJobs(): Promise<Job[]> {
    let allJobs: Job[] = [];
    let start = 0;
    const BATCH_SIZE = 25;
    let hasMore = true;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    console.log(this.url(0));
    console.log(this.getCacheKey());

    try {
      // Check cache first
      const cacheKey = this.getCacheKey();
      const cachedJobs = cache.get(cacheKey);
      if (cachedJobs) {
        console.log("💾 Returning cached results (query skipped)");
        return cachedJobs;
      }

      while (hasMore) {
        try {
          const jobs = await this.fetchJobBatch(start);

          if (!jobs || jobs.length === 0) {
            hasMore = false;
            break;
          }

          allJobs.push(...jobs);
          console.log(`Fetched ${jobs.length} jobs. Total: ${allJobs.length}`);

          if (this.limit && allJobs.length >= this.limit) {
            allJobs = allJobs.slice(0, this.limit);
            break;
          }

          // Reset error counter on successful fetch
          consecutiveErrors = 0;
          start += BATCH_SIZE;

          // Add reasonable delay between requests
          await delay(2000 + Math.random() * 1000);
        } catch (error) {
          consecutiveErrors++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(
            `Error fetching batch (attempt ${consecutiveErrors}):`,
            errorMessage
          );

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.log("Max consecutive errors reached. Stopping.");
            break;
          }

          // Exponential backoff
          await delay(Math.pow(2, consecutiveErrors) * 1000);
        }
      }

      // Handle empty results
      if (allJobs.length === 0) {
        console.log("ℹ No jobs returned from LinkedIn");
        return [];
      }

      // Filter for new jobs and insert into database
      const newJobs = await jobDb.filterNewJobs(allJobs);
      
      if (newJobs.length > 0) {
        await jobDb.batchInsertJobs(newJobs);
        cache.set(this.getCacheKey(), newJobs);
        
        // Send Discord notification for new jobs
        await sendDiscordNotification(newJobs, this.keyword.replace(/\+/g, ' '));
      } else {
        console.log(`ℹ All ${allJobs.length} jobs already exist in database`);
      }

      return newJobs;
    } catch (error) {
      console.error("Fatal error in job fetching:", error);
      throw error;
    }
  }

  private async fetchJobBatch(start: number): Promise<Job[]> {
    const headers = {
      "User-Agent": randomUseragent.getRandom() || "Mozilla/5.0",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://www.linkedin.com/jobs",
      "X-Requested-With": "XMLHttpRequest",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };

    try {
      const response = await axios.get(this.url(start), {
        headers,
        validateStatus: function (status) {
          return status === 200;
        },
        timeout: 10000,
      });

      return parseJobList(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new Error("Rate limit reached");
      }
      throw error;
    }
  }
}

function subtractTimeString(timeStr: string): string {
  const date = new Date();
  
  // Parse the time string
  const match = timeStr.match(/(\d+)\s*(minute|minutes|hour|hours|day|days|second|seconds)/i);
  if (!match) throw new Error('Invalid time format');
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  // Convert to milliseconds
  const multipliers: Record<string, number> = {
    second: 1000,
    seconds: 1000,
    minute: 60000,
    minutes: 60000,
    hour: 3600000,
    hours: 3600000,
    day: 86400000,
    days: 86400000
  };
  
  const milliseconds = value * multipliers[unit];
  return (new Date(date.getTime() - milliseconds)).toLocaleString();
}

// Usage

function parseJobList(jobData: string): Job[] {
  try {
    const $ = load(jobData);
    const jobs = $("li");

    return jobs
      .map((index, element) => {
        try {
          const job = $(element);
          const position = job.find(".base-search-card__title").text().trim();
          const company = job.find(".base-search-card__subtitle").text().trim();
          const location = job.find(".job-search-card__location").text().trim();
          const dateElement = job.find("time");
          const date = dateElement.attr("datetime") || "";
          const postDate = dateElement.text().split(" ");
          postDate.pop(); // Last word in array is ago, we dont need
          const postDateTime = subtractTimeString(postDate.join(" "));
          const salary = job
            .find(".job-search-card__salary-info")
            .text()
            .trim()
            .replace(/\s+/g, " ");
          const jobUrl = job.find(".base-card__full-link").attr("href") || "";
          const companyLogo = job
            .find(".artdeco-entity-image")
            .attr("data-delayed-url") || "";
          const agoTime = job.find(".job-search-card__listdate").text().trim();

          // Only return job if we have at least position and company
          if (!position || !company) {
            return null;
          }

          return {
            position,
            company,
            location,
            date,
            postDateTime,
            salary: salary || "Not specified",
            jobUrl,
            companyLogo,
            agoTime: agoTime || "",
          };
        } catch (err) {
          console.warn(`Error parsing job at index ${index}:`, err instanceof Error ? err.message : "Unknown error");
          return null;
        }
      })
      .get()
      .filter((job): job is Job => job !== null);
  } catch (error) {
    console.error("Error parsing job list:", error);
    return [];
  }
}

// Main query function
export function query(queryObject: QueryOptions): Promise<Job[]> {
  const queryInstance = new Query(queryObject);
  return queryInstance.getJobs();
}

// Export additional utilities for testing and monitoring
export { cache };
export const clearCache = (): void => cache.clear();
export const getCacheSize = (): number => cache.size;
