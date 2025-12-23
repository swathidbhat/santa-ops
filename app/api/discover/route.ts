import { NextRequest, NextResponse } from "next/server";
import { searchProducts, cleanupSearch } from "@/lib/browser/search";
import { getGiftById, updateWithSuggestion } from "@/lib/store/gifts";

export const maxDuration = 60;

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

    console.log(`[Discover] Processing: ${gift.name} - ${gift.giftIdea} ($${gift.budget})`);

    const result = await searchProducts(gift.giftIdea, gift.budget);

    if (!result.selected) {
      return NextResponse.json({
        success: false,
        message: "No products found within budget",
        giftId: gift.id,
      });
    }

    updateWithSuggestion(gift.id, result.selected.url, result.selected.imageUrl);

    return NextResponse.json({
      success: true,
      giftId: gift.id,
      product: result.selected,
      alternativeCount: result.alternatives.length,
    });
  } catch (error) {
    console.error("[Discover] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await cleanupSearch();
  }
}
