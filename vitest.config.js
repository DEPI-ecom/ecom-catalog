import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        env: {
            NODE_ENV: 'test'
            // DATABASE_URL comes from ecom-catalog/.env (catalog_db, seeded).
        }
    }
});