import express from "express";

import path from "path";
import cors from "cors";
import microCors from "micro-cors";
import movieRouter from "./routes/movieRoutes.js";
import AppError from "./utils/appError.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();

const cors = microCors({
  allowMethods: ["GET", "POST", "OPTIONS"],
  origin: "*",
});
app.use(cors);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
app.use("/api/v1/movies", movieRouter);
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

export default app;
