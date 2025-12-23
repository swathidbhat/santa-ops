import { z } from "zod";

// Gift row status enums
export const ApprovalStatus = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
} as const;

export const OrderStatus = {
  NOT_STARTED: "Not started",
  ORDERED: "Ordered",
  MANUAL_REQUIRED: "Manual purchase required",
  FAILED: "Failed",
} as const;

// Zod schemas for validation
export const GiftRowSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  giftIdea: z.string().min(1),
  budget: z.number().positive(),
  productLink: z.string().url().optional(),
  productImage: z.string().url().optional(),
  approvalStatus: z.enum(["Pending", "Approved", "Denied"]).optional(),
  orderStatus: z
    .enum(["Not started", "Ordered", "Manual purchase required", "Failed"])
    .optional(),
  riddle: z.string().optional(),
  cardLink: z.string().url().optional(),
});

export type GiftRow = z.infer<typeof GiftRowSchema>;

// Product candidate from search
export interface ProductCandidate {
  title: string;
  price: number;
  url: string;
  imageUrl: string;
  source: string;
}

// Search result with multiple candidates
export interface ProductSearchResult {
  query: string;
  budget: number;
  selected: ProductCandidate | null;
  alternatives: ProductCandidate[];
}

// API response types
export interface OrchestrationResult {
  rowId: string;
  name: string;
  status: "success" | "partial" | "failed";
  steps: {
    discovery: boolean;
    approval: boolean;
    order: boolean;
    riddle: boolean;
    card: boolean;
  };
  error?: string;
}

// Notion property names (must match database schema)
export const NotionProperties = {
  NAME: "Name",
  GIFT_IDEA: "Gift Idea",
  BUDGET: "Budget",
  PRODUCT_LINK: "Product Link",
  PRODUCT_IMAGE: "Product Image",
  APPROVAL_STATUS: "Approval Status",
  ORDER_STATUS: "Order Status",
  RIDDLE: "Riddle",
  CARD_LINK: "Card Link",
} as const;

