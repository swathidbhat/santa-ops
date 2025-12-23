import { NextRequest, NextResponse } from "next/server";
import { getGiftById, updateRiddle } from "@/lib/store/gifts";
import { generateRiddle } from "@/lib/ai/openai";

export async function POST(request: NextRequest) {
  try {
    const { giftId } = await request.json();

    if (!giftId) {
      return NextResponse.json({ error: "giftId is required" }, { status: 400 });
    }

    const gift = getGiftById(giftId);
    if (!gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    console.log(`[Riddle] Generating for: ${gift.name} - ${gift.giftIdea}`);

    const riddle = await generateRiddle(gift.name, gift.giftIdea);
    updateRiddle(gift.id, riddle);

    return NextResponse.json({
      success: true,
      giftId: gift.id,
      riddle,
    });
  } catch (error) {
    console.error("[Riddle] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
