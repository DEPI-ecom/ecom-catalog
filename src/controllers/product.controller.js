
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/app-error.js";
import { parseQuery } from "../utils/validate.js";

const productQuerySchema = z.object({
    categoryId: z.string().optional(),

    minPrice: z.coerce.number().min(0).optional(),

    maxPrice: z.coerce.number().min(0).optional(),

    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce.number().int().min(1).max(50).default(10),

    sort: z.enum([
        "newest",
        "price_asc",
        "price_desc",
        "name"
    ]).default("newest")
}).refine(
    data => (
        data.minPrice === undefined ||
        data.maxPrice === undefined ||
        data.minPrice <= data.maxPrice
    ),
    {
        message: "minPrice cannot be greater than maxPrice"
    }
);

const productInclude = {
    category: {
        select: {
            id: true,
            name: true,
            slug: true
        }
    }
};

export async function getProducts(req, res) {
    const filters = parseQuery(productQuerySchema, req.query);

    const where = {
        isActive: true
    };

    if (filters.categoryId) {
        where.categoryId = filters.categoryId;
    }

    if (
        filters.minPrice !== undefined ||
        filters.maxPrice !== undefined
    ) {
        where.price = {};

        if (filters.minPrice !== undefined) {
            where.price.gte = filters.minPrice;
        }

        if (filters.maxPrice !== undefined) {
            where.price.lte = filters.maxPrice;
        }
    }

    let orderBy;

    switch (filters.sort) {
        case "price_asc":
            orderBy = { price: "asc" };
            break;

        case "price_desc":
            orderBy = { price: "desc" };
            break;

        case "name":
            orderBy = { name: "asc" };
            break;

        default:
            orderBy = { createdAt: "desc" };
    }

    const skip = (filters.page - 1) * filters.limit;

    const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
            where,
            include: productInclude,
            orderBy,
            skip,
            take: filters.limit
        }),

        prisma.product.count({ where })
    ]);

    res.status(200).json({
        data: {
            products,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit)
            }
        }
    });
}

export async function getProductById(req, res) {
    const product = await prisma.product.findFirst({
        where: {
            id: req.params.productId,
            isActive: true
        },
        include: productInclude
    });

    if (!product) {
        throw new AppError(
            404,
            "Product not found",
            "PRODUCT_NOT_FOUND"
        );
    }

    res.status(200).json({
        data: { product }
    });
}
