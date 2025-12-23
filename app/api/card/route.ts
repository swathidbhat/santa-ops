import { NextRequest, NextResponse } from "next/server";
import { getGiftById, updateCardLink } from "@/lib/store/gifts";
import { generateCard } from "@/lib/gamma/client";

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

    if (!gift.riddle) {
      return NextResponse.json(
        { error: "No riddle found. Generate riddle first." },
        { status: 400 }
      );
    }

    console.log(`[Card] Generating for: ${gift.name}`);

    const cardUrl = await generateCard(gift.name, gift.riddle);
    updateCardLink(gift.id, cardUrl);

    return NextResponse.json({
      success: true,
      giftId: gift.id,
      cardUrl,
    });
  } catch (error) {
    console.error("[Card] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
