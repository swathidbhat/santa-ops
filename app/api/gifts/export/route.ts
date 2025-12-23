import { NextResponse } from "next/server";
import { exportToCSV } from "@/lib/store/gifts";

// GET - Export gifts to CSV
export async function GET() {
  const csv = exportToCSV();
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=santa-ops-gifts.csv",
    },
  });
}

