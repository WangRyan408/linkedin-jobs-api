import { query, type QueryOptions } from "./scrape.js";


const SWE: QueryOptions = {
  distance: "25",
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
  distance: "25",
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

});

query(SRE).then((response) => {
  console.log(response); // An array of Job objects

});

setInterval(async () => {
  query(SWE).then((response) => {
    console.log(response); // An array of Job objects
});
  query(SRE).then((response) => {
    console.log(response); // An array of Job objects
});
}, 3600000); // Run every hour