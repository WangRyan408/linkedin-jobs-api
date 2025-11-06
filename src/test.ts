import { query, type QueryOptions } from "./index.js";

const queryOptions: QueryOptions = {
  keyword: "Software Engineer",
  location: "Santa Clara, California, United States",
  dateSincePosted: "24hr",
  jobType: "internship",
  remoteFilter: "",
  salary: "40000",
  experienceLevel: "",
  limit: "5",
  sortBy: "relevant",
  page: "1",
  has_verification: false,
  under_10_applicants: false,
};

query(queryOptions).then((response) => {
  console.log(response); // An array of Job objects
});
