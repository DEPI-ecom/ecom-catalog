
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Catalog API", () => {
    before(async () => {
        await prisma.$connect();
    });

    after(async () => {
        await prisma.$disconnect();
    });

    it("should return the health status", async () => {
        const response = await request(app)
            .get("/health");

        assert.equal(response.status, 200);
        assert.equal(response.body.status, "ok");
        assert.equal(response.body.database, "connected");
    });

    it("should return the product list", async () => {
        const response = await request(app)
            .get("/products");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body.data.products));
        assert.ok(response.body.data.pagination);
    });

    it("should return categories", async () => {
        const response = await request(app)
            .get("/categories");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body.data.categories));
    });

    it("should reject invalid pagination values", async () => {
        const response = await request(app)
            .get("/products?page=-1");

        assert.equal(response.status, 400);
        assert.equal(
            response.body.error.code,
            "VALIDATION_ERROR"
        );
    });

    it("should return 404 for a nonexistent product", async () => {
        const response = await request(app)
            .get("/products/nonexistent-product-id");

        assert.equal(response.status, 404);
        assert.equal(
            response.body.error.code,
            "PRODUCT_NOT_FOUND"
        );
    });
});
