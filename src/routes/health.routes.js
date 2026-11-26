import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
        status: "ok",
        service: "ecom-catalog",
        database: "connected",
        timestamp: new Date().toISOString()
    });
});

export default router;
