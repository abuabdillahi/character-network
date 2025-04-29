import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const CACHE_TTL = 60 * 60 * 24; // Cache for 24 hours

interface CharacterInteraction {
  interactions: number;
}

interface CharacterRelations {
  [key: string]: CharacterInteraction;
}

interface CharacterData {
  [key: string]: CharacterRelations;
}

interface AnalysisResult {
  interactions: CharacterData;
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const request = await req.json();
    const bookText = request.bookText;
    const bookId = request.bookId;

    if (!bookText || typeof bookText !== 'string') {
      return NextResponse.json(
        { error: "Book text is required" },
        { status: 400 }
      );
    }

    // Generate a cache key based on the book id
    const cacheKey = `analysis:${bookId}`;

    // Try to get cached result
    const cachedResult = await redis.get<AnalysisResult>(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Truncate text to 50000 characters
    const truncatedText = bookText.slice(0, 50000);

    // Define the JSON Schema for the response
    const jsonSchema = {
      "type": "object",
      "patternProperties": {
        "^.+$": {
          "type": "object",
          "patternProperties": {
            "^.+$": {
              "type": "object",
              "properties": {
                "interactions": {
                  "type": "integer",
                  "minimum": 1,
                  "description": "The number of interactions between the two characters"
                }
              },
              "required": ["interactions"],
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    };

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a literary analysis expert who analyses books to find interactions between characters.
                    You respond in JSON format.
                    Analyze the provided book text to identify characters and their interactions.
                    An interaction is defined as a conversation between two characters.
                    Only include human characters, and exclude groups such as companies, organizations, etc.
                    
                    Your response must strictly conform to this JSON Schema:
                    ${JSON.stringify(jsonSchema, null, 2)}
                    Do not include any other text in your response.`
        },
        {
          role: "user",
          content: `Analyze the following book text and identify all characters and their interactions.
                    Text: ${truncatedText}`
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
      max_tokens: 4000
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error("No response from Groq");
    }

    const interactions = JSON.parse(completion.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "")) as CharacterData;
    const result: AnalysisResult = { interactions };

    // Cache the result
    await redis.set(cacheKey, result, { ex: CACHE_TTL });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing text:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}