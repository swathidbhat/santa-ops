import { GiftRow, ApprovalStatus, OrderStatus } from "../types";

// In-memory store for gift rows (persists during server runtime)
// In production, you'd use a database or file storage
let giftStore: Map<string, GiftRow> = new Map();

// Generate a simple unique ID
function generateId(): string {
  return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Parse CSV content into gift rows
export function parseCSV(csvContent: string): GiftRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  // Parse header (case-insensitive)
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  
  const nameIdx = header.findIndex((h) => h === "name");
  const giftIdeaIdx = header.findIndex((h) => h === "gift idea" || h === "giftidea" || h === "gift");
  const budgetIdx = header.findIndex((h) => h === "budget" || h === "max budget" || h === "price");

  if (nameIdx === -1 || giftIdeaIdx === -1 || budgetIdx === -1) {
    throw new Error(
      "CSV must have columns: Name, Gift Idea, Budget. Found: " + header.join(", ")
    );
  }

  const rows: GiftRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV values
    const values = parseCSVLine(line);
    
    const name = values[nameIdx]?.trim() || "";
    const giftIdea = values[giftIdeaIdx]?.trim() || "";
    const budgetStr = values[budgetIdx]?.trim().replace(/[$,]/g, "") || "0";
    const budget = parseFloat(budgetStr);

    if (!name || !giftIdea || budget <= 0) {
      console.warn(`Skipping row ${i + 1}: missing required fields`);
      continue;
    }

    rows.push({
      id: generateId(),
      name,
      giftIdea,
      budget,
      approvalStatus: undefined,
      orderStatus: undefined,
    });
  }

  return rows;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

// Import gifts from CSV (replaces existing data)
export function importGifts(csvContent: string): GiftRow[] {
  const rows = parseCSV(csvContent);
  
  // Clear existing and add new
  giftStore.clear();
  for (const row of rows) {
    giftStore.set(row.id, row);
  }

  return rows;
}

// Get all gifts
export function getAllGifts(): GiftRow[] {
  return Array.from(giftStore.values());
}

// Get gift by ID
export function getGiftById(id: string): GiftRow | undefined {
  return giftStore.get(id);
}

// Get pending gifts (no approval status or pending)
export function getPendingGifts(): GiftRow[] {
  return getAllGifts().filter(
    (g) => !g.approvalStatus || g.approvalStatus === ApprovalStatus.PENDING
  );
}

// Get approved gifts ready for ordering
export function getApprovedGifts(): GiftRow[] {
  return getAllGifts().filter(
    (g) =>
      g.approvalStatus === ApprovalStatus.APPROVED &&
      (!g.orderStatus || g.orderStatus === OrderStatus.NOT_STARTED)
  );
}

// Update a gift
export function updateGift(id: string, updates: Partial<GiftRow>): GiftRow | undefined {
  const gift = giftStore.get(id);
  if (!gift) return undefined;

  const updated = { ...gift, ...updates };
  giftStore.set(id, updated);
  return updated;
}

// Update gift with product suggestion
export function updateWithSuggestion(
  id: string,
  productUrl: string,
  productImage: string
): GiftRow | undefined {
  return updateGift(id, {
    productLink: productUrl,
    productImage: productImage,
    approvalStatus: ApprovalStatus.PENDING,
  });
}

// Update approval status
export function updateApprovalStatus(
  id: string,
  status: (typeof ApprovalStatus)[keyof typeof ApprovalStatus]
): GiftRow | undefined {
  return updateGift(id, { approvalStatus: status });
}

// Update order status
export function updateOrderStatus(
  id: string,
  status: (typeof OrderStatus)[keyof typeof OrderStatus]
): GiftRow | undefined {
  return updateGift(id, { orderStatus: status });
}

// Update riddle
export function updateRiddle(id: string, riddle: string): GiftRow | undefined {
  return updateGift(id, { riddle });
}

// Update card link
export function updateCardLink(id: string, cardLink: string): GiftRow | undefined {
  return updateGift(id, { cardLink });
}

// Clear all gifts
export function clearGifts(): void {
  giftStore.clear();
}

// Export gifts to CSV
export function exportToCSV(): string {
  const gifts = getAllGifts();
  const headers = [
    "Name",
    "Gift Idea",
    "Budget",
    "Product Link",
    "Product Image",
    "Approval Status",
    "Order Status",
    "Riddle",
    "Card Link",
  ];

  const rows = gifts.map((g) => [
    `"${g.name}"`,
    `"${g.giftIdea}"`,
    g.budget,
    g.productLink || "",
    g.productImage || "",
    g.approvalStatus || "",
    g.orderStatus || "",
    `"${(g.riddle || "").replace(/"/g, '""')}"`,
    g.cardLink || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

