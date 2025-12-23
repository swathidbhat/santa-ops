import { NextRequest, NextResponse } from "next/server";
import {
  importGifts,
  getAllGifts,
  clearGifts,
  exportToCSV,
} from "@/lib/store/gifts";

// GET - Fetch all gifts
export async function GET() {
  const gifts = getAllGifts();
  return NextResponse.json({ gifts, count: gifts.length });
}

// POST - Import gifts from CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const gifts = importGifts(csvContent);

    return NextResponse.json({
      success: true,
      imported: gifts.length,
      gifts,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import CSV" },
      { status: 400 }
    );
  }
}

// DELETE - Clear all gifts
export async function DELETE() {
  clearGifts();
  return NextResponse.json({ success: true });
}

