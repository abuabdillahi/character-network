import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const bookText = await req.text();

    if (!bookText || typeof bookText !== 'string') {
      return NextResponse.json(
        { error: "Book text is required" },
        { status: 400 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Truncate text if too long (Groq has token limits)
    const truncatedText = bookText.slice(0, 30000);

    // Define the JSON Schema for the response
    const jsonSchema = {
      "type": "object",
      "patternProperties": {
        "^.+$": { // Character name pattern (any string)
          "type": "object",
          "patternProperties": {
            "^.+$": { // Other character name pattern (any string)
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

    // Example response that conforms to the schema
    const exampleResponse = {
      "Character A": {
        "Character B": {
          "interactions": 4
        },
        "Character C": {
          "interactions": 2
        }
      },
      "Character B": {
        "Character A": {
          "interactions": 4
        }
      },
      "Character C": {
        "Character A": {
          "interactions": 2
        }
      }
    };

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a literary analysis expert who analyses books to find interfactions between characters.
                    You respond in JSON format.
                    Analyze the provided book text to identify characters and their interactions.
                    An interaction is defined as a conversation between two characters.
                    Only include human characters, and exclude groups such as companies, organizations, etc.
                    
                    Your response must conform to this JSON Schema:
                    ${JSON.stringify(jsonSchema, null, 2)}
                    
                    Do not include any other text in your response, before or after the JSON object.

                    Here's an example of a conforming response:
                    ${JSON.stringify(exampleResponse, null, 2)}`
        },
        {
          role: "user",
          content: `Analyze the following book text and identify all characters and their interactions.
                    Book text: ${truncatedText}`
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
      max_tokens: 4000
    });

    const interactions = completion.choices[0].message.content || "{}";

    console.log(interactions);

    return NextResponse.json({ interactions: JSON.parse(interactions.replace(/```json/g, "").replace(/```/g, "").replace(/```/g, "")) });
  } catch (error) {
    console.error("Error analyzing text:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}