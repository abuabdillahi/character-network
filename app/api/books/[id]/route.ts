import { NextResponse } from "next/server";

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

            // Return the text with proper content type
            return new NextResponse(text, {
                headers: {
                    "Content-Type": "text/plain",
                },
            });
        }

        const text = await response.text();

        // Return the text with proper content type
        return new NextResponse(text, {
            headers: {
                "Content-Type": "text/plain",
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
