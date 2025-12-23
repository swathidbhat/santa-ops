export const RIDDLE_SYSTEM_PROMPT = `You are a playful holiday poet who writes clever riddles. 
Your riddles should be:
- Exactly 4 lines
- Rhyming (AABB or ABAB pattern)
- Festive and fun in tone
- Subtle hints without revealing the gift directly

IMPORTANT: Never mention the actual gift name in the riddle. Use clever hints and metaphors instead.`;

export function createRiddlePrompt(recipientName: string, giftIdea: string): string {
  return `Write a 4-line rhyming riddle for ${recipientName} about their holiday gift.

The gift is: ${giftIdea}

Remember:
- Do NOT mention "${giftIdea}" or any direct synonym
- Use playful hints and metaphors
- Make it festive and warm
- The recipient should be able to guess but not immediately know

Write ONLY the 4-line riddle, nothing else.`;
}

