// Type definitions
export interface QueryOptions {
  host?: string;
  keyword?: string;
  location?: string;
  dateSincePosted?: string;
  jobType?: string;
  remoteFilter?: string;
  salary?: string;
  experienceLevel?: string;
  sortBy?: string;
  limit?: number | string;
  page?: number | string;
  has_verification?: boolean;
  under_10_applicants?: boolean;
}

export interface Job {
  position: string;
  company: string;
  location: string;
  date: string;
  salary: string;
  jobUrl: string;
  companyLogo: string;
  agoTime: string;
}

export interface CacheItem {
  data: Job[];
  timestamp: number;
}
