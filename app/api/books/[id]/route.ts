import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const CACHE_TTL = 60 * 60 * 24; // Cache for 24 hours

// Initialize Redis client
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

        // Try to get cached result
        const cacheKey = `book:${bookId}`;
        const cachedText = await redis.get<string>(cacheKey);
        if (cachedText) {
            return new NextResponse(cachedText, {
                headers: {
                    "Content-Type": "text/plain",
                    "Cache-Control": "public, max-age=86400",
                },
            });
        }

        // Format the URL according to Project Gutenberg's pattern
        const bookUrl = `https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`;

        console.log(`Fetching book from: ${bookUrl}`);

        // Fetch the book content
        const response = await fetch(bookUrl);

        if (!response.ok) {
            // Try alternative URL format if the first one fails
            const alternativeUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
            console.log(`First URL failed, trying alternative: ${alternativeUrl}`);

            const alternativeResponse = await fetch(alternativeUrl);

            if (!alternativeResponse.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch book: ${alternativeResponse.statusText}` },
                    { status: alternativeResponse.status }
                );
            }

            const text = await alternativeResponse.text();

            // Cache the result
            await redis.set(cacheKey, text, { ex: CACHE_TTL });

            return new NextResponse(text, {
                headers: {
                    "Content-Type": "text/plain",
                    "Cache-Control": "public, max-age=86400",
                },
            });
        }

        const text = await response.text();

        // Cache the result
        await redis.set(cacheKey, text, { ex: CACHE_TTL });

        return new NextResponse(text, {
            headers: {
                "Content-Type": "text/plain",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Error fetching book:", error);
        return NextResponse.json(
            { error: "Failed to fetch book text" },
            { status: 500 }
        );
    }
}
