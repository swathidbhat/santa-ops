import { NextRequest, NextResponse } from "next/server";
import {
  getPendingGifts,
  getApprovedGifts,
  getGiftById,
  updateWithSuggestion,
  updateOrderStatus,
  updateRiddle,
  updateCardLink,
} from "@/lib/store/gifts";
import { searchProducts, cleanupSearch } from "@/lib/browser/search";
import { attemptCheckout } from "@/lib/browser/checkout";
import { closeBrowser } from "@/lib/browser/agent";
import { generateRiddle } from "@/lib/ai/openai";
import { generateCard } from "@/lib/gamma/client";
import { OrderStatus, OrchestrationResult } from "@/lib/types";

export const maxDuration = 60;

// Process a single row through discovery
async function processDiscovery(
  giftId: string
): Promise<{ success: boolean; error?: string }> {
  const gift = getGiftById(giftId);
  if (!gift) return { success: false, error: "Gift not found" };

  const result = await searchProducts(gift.giftIdea, gift.budget);
  if (!result.selected) {
    return { success: false, error: "No products found within budget" };
  }

  updateWithSuggestion(gift.id, result.selected.url, result.selected.imageUrl);
  return { success: true };
}

// Process a single row through ordering
async function processOrder(
  giftId: string
): Promise<{ success: boolean; error?: string }> {
  const gift = getGiftById(giftId);
  if (!gift) return { success: false, error: "Gift not found" };
  if (!gift.productLink) return { success: false, error: "No product link" };

  const result = await attemptCheckout(gift.productLink);

  const status =
    result.status === "ordered"
      ? OrderStatus.ORDERED
      : result.status === "manual_required"
      ? OrderStatus.MANUAL_REQUIRED
      : OrderStatus.FAILED;

  updateOrderStatus(gift.id, status);
  return { success: result.success || result.status === "manual_required" };
}

// Process a single row through riddle generation
async function processRiddle(
  giftId: string
): Promise<{ success: boolean; error?: string }> {
  const gift = getGiftById(giftId);
  if (!gift) return { success: false, error: "Gift not found" };

  const riddle = await generateRiddle(gift.name, gift.giftIdea);
  updateRiddle(gift.id, riddle);
  return { success: true };
}

// Process a single row through card generation
async function processCard(
  giftId: string
): Promise<{ success: boolean; error?: string }> {
  const gift = getGiftById(giftId);
  if (!gift) return { success: false, error: "Gift not found" };
  if (!gift.riddle) return { success: false, error: "No riddle found" };

  const cardUrl = await generateCard(gift.name, gift.riddle);
  updateCardLink(gift.id, cardUrl);
  return { success: true };
}

export async function POST(request: NextRequest) {
  const results: OrchestrationResult[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "discovery"; // discovery, orders, riddles, cards, full

    console.log(`[Orchestrate] Starting in mode: ${mode}`);

    // Mode: Discovery - Find products for pending rows
    if (mode === "discovery" || mode === "full") {
      const pendingGifts = getPendingGifts();
      console.log(`[Orchestrate] Found ${pendingGifts.length} pending gifts`);

      for (const gift of pendingGifts) {
        // Skip gifts that already have a product link (just pending approval)
        if (gift.productLink && gift.approvalStatus === "Pending") {
          console.log(`[Orchestrate] Skipping ${gift.name} - already has suggestion`);
          continue;
        }

        try {
          const result = await processDiscovery(gift.id);
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: result.success ? "success" : "failed",
            steps: {
              discovery: result.success,
              approval: false,
              order: false,
              riddle: false,
              card: false,
            },
            error: result.error,
          });
        } catch (error) {
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: "failed",
            steps: {
              discovery: false,
              approval: false,
              order: false,
              riddle: false,
              card: false,
            },
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Mode: Orders - Process approved rows
    if (mode === "orders" || mode === "full") {
      const approvedGifts = getApprovedGifts();
      console.log(`[Orchestrate] Found ${approvedGifts.length} approved gifts`);

      for (const gift of approvedGifts) {
        try {
          const orderResult = await processOrder(gift.id);
          const riddleResult = await processRiddle(gift.id);

          let cardResult: { success: boolean; error?: string } = { success: false, error: "Skipped" };
          if (riddleResult.success) {
            cardResult = await processCard(gift.id);
          }

          results.push({
            rowId: gift.id,
            name: gift.name,
            status:
              orderResult.success && riddleResult.success && cardResult.success
                ? "success"
                : "partial",
            steps: {
              discovery: true,
              approval: true,
              order: orderResult.success,
              riddle: riddleResult.success,
              card: cardResult.success,
            },
          });
        } catch (error) {
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: "failed",
            steps: {
              discovery: true,
              approval: true,
              order: false,
              riddle: false,
              card: false,
            },
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Mode: Riddles only
    if (mode === "riddles") {
      const approvedGifts = getApprovedGifts();
      for (const gift of approvedGifts) {
        if (gift.riddle) continue;

        try {
          const result = await processRiddle(gift.id);
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: result.success ? "success" : "failed",
            steps: {
              discovery: true,
              approval: true,
              order: false,
              riddle: result.success,
              card: false,
            },
            error: result.error,
          });
        } catch (error) {
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: "failed",
            steps: {
              discovery: true,
              approval: true,
              order: false,
              riddle: false,
              card: false,
            },
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Mode: Cards only
    if (mode === "cards") {
      const approvedGifts = getApprovedGifts();
      for (const gift of approvedGifts) {
        if (!gift.riddle || gift.cardLink) continue;

        try {
          const result = await processCard(gift.id);
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: result.success ? "success" : "failed",
            steps: {
              discovery: true,
              approval: true,
              order: false,
              riddle: true,
              card: result.success,
            },
            error: result.error,
          });
        } catch (error) {
          results.push({
            rowId: gift.id,
            name: gift.name,
            status: "failed",
            steps: {
              discovery: true,
              approval: true,
              order: false,
              riddle: true,
              card: false,
            },
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("[Orchestrate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await cleanupSearch();
    await closeBrowser();
  }
}
