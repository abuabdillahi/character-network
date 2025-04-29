import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const CHUNK_SIZE = 10000; // Process 10k characters at a time
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
    const bookText = await req.text();

    if (!bookText || typeof bookText !== 'string') {
      return NextResponse.json(
        { error: "Book text is required" },
        { status: 400 }
      );
    }

    // Generate a cache key based on the book text
    const cacheKey = `analysis:${Buffer.from(bookText).toString('base64').slice(0, 50)}`;

    // Try to get cached result
    const cachedResult = await redis.get<AnalysisResult>(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Truncate text to 100000 characters
    const truncatedText = bookText.slice(0, 100000);

    // Split text into chunks
    const chunks = [];
    for (let i = 0; i < truncatedText.length; i += CHUNK_SIZE) {
      chunks.push(truncatedText.slice(i, i + CHUNK_SIZE));
    }

    console.log(chunks);

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

    // Analyze chunks in parallel
    const chunkPromises = chunks.map(chunk =>
      groq.chat.completions.create({
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
                      Book text: ${chunk}`
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        max_tokens: 4000
      })
    );

    const chunkResults = await Promise.all(chunkPromises);

    console.log(chunkResults);

    // Merge results from all chunks
    const mergedInteractions: CharacterData = {};
    chunkResults.forEach(result => {
      if (!result.choices[0]?.message?.content) return;
      console.log(result.choices[0].message.content);

      const interactions = JSON.parse(result.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "")) as CharacterData;
      console.log(interactions);
      Object.entries(interactions).forEach(([char1, relations]) => {
        if (!mergedInteractions[char1]) {
          mergedInteractions[char1] = {};
        }
        Object.entries(relations).forEach(([char2, data]) => {
          if (!mergedInteractions[char1][char2]) {
            mergedInteractions[char1][char2] = { interactions: 0 };
          }
          mergedInteractions[char1][char2].interactions += data.interactions;
        });
      });
    });

    console.log(mergedInteractions);

    const result: AnalysisResult = { interactions: mergedInteractions };

    console.log(result);

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