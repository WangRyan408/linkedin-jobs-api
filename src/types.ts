// Type definitions

// Add distance param (int) - search radius in miles
// Add f_AL param (bool)- Actively hiring
// Add f_F param (string) - Job Function
// Add f_JIYN param (bool) - job connections filter
// Add refresh param (bool) - Refreshes search results
export interface QueryOptions {
  host?: string;
  distance?: number;
  active?: boolean
  keyword?: string;
  jobFunction?: 'sale' | 'mgmt' | 'acct' | 'it' | 'mktg' | 'hr';
  industry?: 4 | 5 | 9 | 19;
  jobConnections?: boolean;
  location?: string;
  dateSincePosted?: string;
  jobType?: string;
  remoteFilter?: string;
  refresh?: boolean;
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
