
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
    {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories"
    },
    {
        name: "Clothing",
        slug: "clothing",
        description: "Clothes and fashion accessories"
    },
    {
        name: "Home and Living",
        slug: "home-living",
        description: "Products for your home"
    }
];

const products = [
    {
        name: "Wireless Headphones",
        slug: "wireless-headphones",
        description: "Wireless headphones with clear sound and comfortable ear cushions.",
        price: "1499.99",
        stock: 25,
        categorySlug: "electronics"
    },
    {
        name: "Smart Watch",
        slug: "smart-watch",
        description: "Smart watch with activity tracking and notifications.",
        price: "2199.00",
        stock: 15,
        categorySlug: "electronics"
    },
    {
        name: "Bluetooth Speaker",
        slug: "bluetooth-speaker",
        description: "Portable Bluetooth speaker for everyday use.",
        price: "899.50",
        stock: 30,
        categorySlug: "electronics"
    },
    {
        name: "Basic T-Shirt",
        slug: "basic-t-shirt",
        description: "Comfortable everyday cotton T-shirt.",
        price: "299.99",
        stock: 50,
        categorySlug: "clothing"
    },
    {
        name: "Casual Hoodie",
        slug: "casual-hoodie",
        description: "A comfortable hoodie for casual wear.",
        price: "749.00",
        stock: 20,
        categorySlug: "clothing"
    },
    {
        name: "Desk Lamp",
        slug: "desk-lamp",
        description: "Adjustable desk lamp suitable for studying and working.",
        price: "450.00",
        stock: 18,
        categorySlug: "home-living"
    }
];

async function main() {
    for (const category of categories) {
        await prisma.category.upsert({
            where: {
                slug: category.slug
            },
            update: category,
            create: category
        });
    }

    for (const product of products) {
        const category = await prisma.category.findUnique({
            where: {
                slug: product.categorySlug
            }
        });

        await prisma.product.upsert({
            where: {
                slug: product.slug
            },
            update: {
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                categoryId: category.id
            },
            create: {
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                stock: product.stock,
                categoryId: category.id
            }
        });
    }

    console.log("Catalog seed completed successfully.");
}

main()
    .catch(error => {
        console.error("Catalog seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
