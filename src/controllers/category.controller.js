
import { prisma } from "../lib/prisma.js";

export async function getCategories(req, res) {
    const categories = await prisma.category.findMany({
        orderBy: {
            name: "asc"
        },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            _count: {
                select: {
                    products: {
                        where: {
                            isActive: true
                        }
                    }
                }
            }
        }
    });

    res.status(200).json({
        data: { categories }
    });
}
