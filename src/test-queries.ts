import { query, type QueryOptions } from "./scrape.js";
// import { writeFileSync } from "fs";
// import { join } from "path";

const SWE: QueryOptions = {
  distance: "",
  active: false,
  keyword: "Software Engineer Intern",
  jobFunction: "it",
  industry: "Information Technology",
  jobConnections: false,
  location: "Santa Clara, California, United States",
  dateSincePosted: "24hr",
  jobType: "internship",
  remoteFilter: "",
  refresh: true,
  //salary: "40000",
  experienceLevel: "",
  limit: "200",
  sortBy: "relevant",
  page: "0",
  has_verification: false,
  under_10_applicants: false,
};

const SRE: QueryOptions = {
  distance: "",
  active: false,
  keyword: "Site Reliability Engineer Intern",
  jobFunction: "it",
  industry: "Information Technology",
  jobConnections: false,
  location: "Santa Clara, California, United States",
  dateSincePosted: "24hr",
  jobType: "internship",
  remoteFilter: "",
  refresh: true,
  //salary: "40000",
  experienceLevel: "",
  limit: "200",
  sortBy: "relevant",
  page: "0",
  has_verification: false,
  under_10_applicants: false,
};

query(SWE).then((response) => {
  console.log(response); // An array of Job objects
  
  // // Write output to JSON file
  // const outputPath = join(process.cwd(), "swe_job-results.json");
  // writeFileSync(outputPath, JSON.stringify(response, null, 2), "utf-8");
  // console.log(`Results written to ${outputPath}`);
});

query(SRE).then((response) => {
  console.log(response); // An array of Job objects
  
  // Write output to JSON file
  // const outputPath = join(process.cwd(), "sre_job-results.json");
  // writeFileSync(outputPath, JSON.stringify(response, null, 2), "utf-8");
  // console.log(`Results written to ${outputPath}`);
});

setInterval(async () => {
  query(SWE).then((response) => {
    console.log(response); // An array of Job objects
});
  query(SRE).then((response) => {
    console.log(response); // An array of Job objects
});
}, 3600000); // Run every hour