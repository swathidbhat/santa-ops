import { NextRequest, NextResponse } from "next/server";
import { getGiftById, updateWithSuggestion } from "@/lib/store/gifts";
import { searchProducts, cleanupSearch, getNextAlternative } from "@/lib/browser/search";

// In-memory cache for alternatives (would use Redis in production)
const alternativesCache = new Map<string, Array<{ title: string; price: number; url: string; imageUrl: string; source: string }>>();

export async function POST(request: NextRequest) {
  try {
    const { giftId, action } = await request.json();

    if (!giftId) {
      return NextResponse.json({ error: "giftId is required" }, { status: 400 });
    }

    const gift = getGiftById(giftId);
    if (!gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    // Handle denial - find next cheaper alternative
    if (action === "denied" || gift.approvalStatus === "Denied") {
      console.log(`[Webhook] Processing denial for: ${gift.name}`);

      // Check if we have cached alternatives
      let alternatives = alternativesCache.get(gift.id);

      if (!alternatives || alternatives.length === 0) {
        // Re-search and get alternatives
        const result = await searchProducts(gift.giftIdea, gift.budget);
        alternatives = result.alternatives;
        alternativesCache.set(gift.id, alternatives);
      }

      // Get next alternative
      const nextProduct = getNextAlternative(gift.productLink || "", alternatives);

      if (nextProduct) {
        updateWithSuggestion(gift.id, nextProduct.url, nextProduct.imageUrl);

        // Remove used alternative from cache
        const remaining = alternatives.filter((p) => p.url !== nextProduct.url);
        alternativesCache.set(gift.id, remaining);

        return NextResponse.json({
          success: true,
          action: "suggested_alternative",
          product: nextProduct,
          remainingAlternatives: remaining.length,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "No more alternatives available within budget",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "No action needed",
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await cleanupSearch();
  }
}
