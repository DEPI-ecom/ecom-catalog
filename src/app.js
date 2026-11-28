import express from "express";
import helmet from "helmet";

import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import healthRoutes from "./routes/health.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics.middleware.js";

import {
    notFound,
    errorHandler
} from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.get("/metrics", metricsHandler);
app.use(metricsMiddleware);

app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/health", healthRoutes);
app.use("/internal", internalRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
