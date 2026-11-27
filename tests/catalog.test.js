import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// These tests use the real catalog_db and expect the seed data
// (3 categories, 6 products). Run `npx prisma db seed` first on a fresh database.

const getProducts = (query = {}) => request(app).get('/products').query(query);

afterAll(async () => {
    await prisma.$disconnect();
});

describe('catalog own routes', () => {
    it('GET /health', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });

    it('unknown routes return 404 ROUTE_NOT_FOUND', async () => {
        const res = await request(app).get('/nope');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
});

describe('categories', () => {
    it('GET /categories lists the seeded categories', async () => {
        const res = await request(app).get('/categories');
        const names = res.body.data.categories.map((category) => category.name);

        expect(res.status).toBe(200);
        expect(names).toEqual(expect.arrayContaining(['Electronics', 'Clothing', 'Home and Living']));
    });
});

describe('product listing', () => {
    it('returns products with pagination and the default limit', async () => {
        const res = await getProducts();

        expect(res.status).toBe(200);
        expect(res.body.data.products.length).toBeGreaterThan(0);
        expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 10 });
        expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(6);
    });

    it('returns the fields the frontend needs', async () => {
        const res = await getProducts();
        const product = res.body.data.products[0];

        expect(product).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            stock: expect.any(Number)
        });
        expect(product.price).toMatch(/^\d+(\.\d+)?$/); // money is a decimal string
        expect(product.category).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    });

    it('paginates without repeating products', async () => {
        const first = await getProducts({ limit: 2, page: 1 });
        const second = await getProducts({ limit: 2, page: 2 });
        const { total, totalPages } = first.body.data.pagination;

        expect(first.body.data.products).toHaveLength(2);
        expect(totalPages).toBe(Math.ceil(total / 2));

        const firstIds = first.body.data.products.map((p) => p.id);
        const secondIds = second.body.data.products.map((p) => p.id);
        expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    });

    it.each([
        ['limit above 50', { limit: 51 }],
        ['limit 0', { limit: 0 }],
        ['page 0', { page: 0 }],
        ['a non-numeric page', { page: 'abc' }],
        ['an unknown sort value', { sort: 'cheapest' }],
        ['minPrice above maxPrice', { minPrice: 100, maxPrice: 10 }]
    ])('rejects %s with 400 VALIDATION_ERROR', async (_label, query) => {
        const res = await getProducts(query);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('sorting and filtering', () => {
    it('sorts by price ascending', async () => {
        const res = await getProducts({ sort: 'price_asc', limit: 50 });
        const prices = res.body.data.products.map((p) => Number(p.price));

        expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('sorts by price descending', async () => {
        const res = await getProducts({ sort: 'price_desc', limit: 50 });
        const prices = res.body.data.products.map((p) => Number(p.price));

        expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('filters by category', async () => {
        const categories = await request(app).get('/categories');
        const electronics = categories.body.data.categories.find((c) => c.name === 'Electronics');

        const res = await getProducts({ categoryId: electronics.id, limit: 50 });

        expect(res.status).toBe(200);
        expect(res.body.data.products.length).toBeGreaterThan(0);
        expect(res.body.data.products.every((p) => p.category.id === electronics.id)).toBe(true);
    });

    it('returns an empty list for an unknown category', async () => {
        const res = await getProducts({ categoryId: 'no-such-category' });

        expect(res.status).toBe(200);
        expect(res.body.data.products).toEqual([]);
        expect(res.body.data.pagination.total).toBe(0);
    });

    it('filters by price range', async () => {
        const all = await getProducts({ limit: 50 });
        const prices = all.body.data.products.map((p) => Number(p.price)).sort((a, b) => a - b);
        const min = prices[1];
        const max = prices[prices.length - 2];

        const res = await getProducts({ minPrice: min, maxPrice: max, limit: 50 });
        const filtered = res.body.data.products.map((p) => Number(p.price));

        expect(res.status).toBe(200);
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every((price) => price >= min && price <= max)).toBe(true);
    });
});

describe('product details', () => {
    it('GET /products/:productId returns the product', async () => {
        const list = await getProducts();
        const { id, name } = list.body.data.products[0];

        const res = await request(app).get(`/products/${id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.product).toMatchObject({ id, name });
    });

    it('returns 404 PRODUCT_NOT_FOUND for an unknown product', async () => {
        const res = await request(app).get('/products/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
});

describe('inactive products', () => {
    let hidden;

    beforeAll(async () => {
        const category = await prisma.category.findFirst();
        hidden = await prisma.product.create({
            data: {
                name: 'Vitest Hidden Product',
                slug: `vitest-hidden-${Date.now()}`,
                description: 'Inactive product created by the test suite',
                price: '9.99',
                stock: 1,
                isActive: false,
                categoryId: category.id
            }
        });
    });

    afterAll(async () => {
        await prisma.product.delete({ where: { id: hidden.id } });
    });

    it('are not listed', async () => {
        const res = await getProducts({ limit: 50 });
        const ids = res.body.data.products.map((p) => p.id);
        expect(ids).not.toContain(hidden.id);
    });

    it('return 404 PRODUCT_NOT_FOUND by id', async () => {
        const res = await request(app).get(`/products/${hidden.id}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
});

describe('keyword search (q)', () => {
    it('matches product names case-insensitively', async () => {
        const all = await getProducts({ limit: 50 });
        const target = all.body.data.products[0];

        const res = await getProducts({ q: target.name.toUpperCase(), limit: 50 });

        expect(res.status).toBe(200);
        expect(res.body.data.products.map((p) => p.id)).toContain(target.id);
    });

    it('only returns products whose name or description contains q', async () => {
        const all = await getProducts({ limit: 50 });
        const q = all.body.data.products[0].name.split(' ')[0].toLowerCase();

        const res = await getProducts({ q, limit: 50 });

        expect(res.body.data.products.length).toBeGreaterThan(0);
        expect(
            res.body.data.products.every((p) =>
                `${p.name} ${p.description}`.toLowerCase().includes(q)
            )
        ).toBe(true);
    });

    it('returns an empty list when nothing matches', async () => {
        const res = await getProducts({ q: 'zzzz-no-such-product' });

        expect(res.status).toBe(200);
        expect(res.body.data.products).toEqual([]);
        expect(res.body.data.pagination.total).toBe(0);
    });

    it('ignores a blank q', async () => {
        const all = await getProducts();
        const blank = await getProducts({ q: '   ' });

        expect(blank.body.data.pagination.total).toBe(all.body.data.pagination.total);
    });

    it('combines q with the category filter', async () => {
        const all = await getProducts({ limit: 50 });
        const { id, name, category } = all.body.data.products[0];

        const same = await getProducts({ q: name, categoryId: category.id });
        const other = await getProducts({ q: name, categoryId: 'no-such-category' });

        expect(same.body.data.products.map((p) => p.id)).toContain(id);
        expect(other.body.data.products).toEqual([]);
    });

    it('rejects q longer than 100 characters', async () => {
        const res = await getProducts({ q: 'x'.repeat(101) });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});