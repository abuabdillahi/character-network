import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const CACHE_TTL = 60 * 60 * 24; // Cache for 24 hours

const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const bookId = (await params).id;
        if (!bookId) {
            return NextResponse.json(
                { error: "Book ID is required" },
                { status: 400 }
            );
        }

        const cacheKey = `book:${bookId}:title`;
        const cachedTitle = await redis.get<string>(cacheKey);

        if (cachedTitle) {
            return NextResponse.json(
                { title: cachedTitle },
                { status: 200 }
            );
        }

        const metadataUrl = `http://gutendex.com/books/${bookId}`;

        console.log(`Fetching book metadata from: ${metadataUrl}`);

        const metadataResponse = await fetch(metadataUrl);
        const metadata = await metadataResponse.json();

        const title = metadata.title;

        if (!title) {
            return NextResponse.json(
                { error: "Book title not found" },
                { status: 404 }
            );
        }

        await redis.set(cacheKey, title, { ex: CACHE_TTL });

        return NextResponse.json(
            { title },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching book title:', error);
        return NextResponse.json(
            { error: 'Failed to fetch book title' },
            { status: 500 }
        );
    }
}