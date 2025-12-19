import express from "express";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL!);
const app = express();
const port = process.env.PORT ?? "9001";

import { getDiningHours } from "./scraper/services/diningService.js";
getDiningHours("2023-10-01").then((result) => {
  if (result.ok) {
    console.log("Dining Hours:", result.data);
  } else {
    console.error("Error fetching dining hours:", result.error);
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
