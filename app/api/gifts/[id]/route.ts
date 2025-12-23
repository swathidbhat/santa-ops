import { NextRequest, NextResponse } from "next/server";
import { getGiftById, updateGift } from "@/lib/store/gifts";

// GET - Fetch single gift
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gift = getGiftById(id);
  
  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }
  
  return NextResponse.json(gift);
}

// PATCH - Update a gift
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();
  
  const gift = updateGift(id, updates);
  
  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }
  
  return NextResponse.json(gift);
}

