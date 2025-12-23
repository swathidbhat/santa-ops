import OpenAI from "openai";
import { RIDDLE_SYSTEM_PROMPT, createRiddlePrompt } from "./prompts";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function generateRiddle(
  recipientName: string,
  giftIdea: string
): Promise<string> {
  const client = getOpenAIClient();

  console.log(`[Riddle] Generating riddle for ${recipientName}: ${giftIdea}`);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: RIDDLE_SYSTEM_PROMPT },
      { role: "user", content: createRiddlePrompt(recipientName, giftIdea) },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  const riddle = response.choices[0]?.message?.content?.trim() || "";

  console.log(`[Riddle] Generated: ${riddle}`);

  return riddle;
}

