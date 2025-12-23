import { NextRequest, NextResponse } from "next/server";
import { getGiftById, updateOrderStatus } from "@/lib/store/gifts";
import { attemptCheckout } from "@/lib/browser/checkout";
import { OrderStatus } from "@/lib/types";
import { closeBrowser } from "@/lib/browser/agent";

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

    if (!gift.productLink) {
      return NextResponse.json(
        { error: "No product link found for this gift" },
        { status: 400 }
      );
    }

    if (gift.approvalStatus !== "Approved") {
      return NextResponse.json(
        { error: "Gift is not approved for ordering" },
        { status: 400 }
      );
    }

    console.log(`[Order] Attempting checkout for: ${gift.name} - ${gift.productLink}`);

    const result = await attemptCheckout(gift.productLink);

    let orderStatus: (typeof OrderStatus)[keyof typeof OrderStatus];
    if (result.status === "ordered") {
      orderStatus = OrderStatus.ORDERED;
    } else if (result.status === "manual_required") {
      orderStatus = OrderStatus.MANUAL_REQUIRED;
    } else {
      orderStatus = OrderStatus.FAILED;
    }

    updateOrderStatus(gift.id, orderStatus);

    return NextResponse.json({
      success: result.success,
      giftId: gift.id,
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    console.error("[Order] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await closeBrowser();
  }
}
