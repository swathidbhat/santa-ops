import { Page } from "puppeteer-core";
import { getBrowser, createStealthPage, closeBrowser } from "./agent";
import { ProductCandidate, ProductSearchResult } from "../types";

// Parse price string to number
function parsePrice(priceStr: string): number | null {
  // Remove currency symbols and parse
  const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(",", "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

// Scrape Google Shopping results
async function scrapeGoogleShopping(
  page: Page,
  query: string
): Promise<ProductCandidate[]> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}&tbm=shop`;

  await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

  // Wait for shopping results to load
  await page.waitForSelector(".sh-dgr__gr-auto, .sh-dgr__content", {
    timeout: 10000,
  }).catch(() => null);

  // Extract product data
  const products = await page.evaluate(() => {
    const results: Array<{
      title: string;
      price: string;
      url: string;
      imageUrl: string;
    }> = [];

    // Try multiple selector patterns for Google Shopping
    const productCards = document.querySelectorAll(
      ".sh-dgr__gr-auto, .sh-dgr__content, [data-docid]"
    );

    productCards.forEach((card) => {
      try {
        // Extract title
        const titleEl = card.querySelector(
          "h3, .tAxDx, [data-name], .Xjkr3b"
        ) as HTMLElement;
        const title = titleEl?.textContent?.trim() || "";

        // Extract price
        const priceEl = card.querySelector(
          ".a8Pemb, .kHxwFf, [data-price], .XrAfOe"
        ) as HTMLElement;
        const price = priceEl?.textContent?.trim() || "";

        // Extract link
        const linkEl = card.querySelector("a[href*='url=']") as HTMLAnchorElement;
        let url = "";
        if (linkEl?.href) {
          // Extract actual URL from Google redirect
          const match = linkEl.href.match(/url=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          } else {
            url = linkEl.href;
          }
        }

        // Extract image
        const imgEl = card.querySelector("img") as HTMLImageElement;
        const imageUrl = imgEl?.src || "";

        if (title && price && url) {
          results.push({ title, price, url, imageUrl });
        }
      } catch {
        // Skip malformed cards
      }
    });

    return results;
  });

  // Parse and validate products
  const candidates: ProductCandidate[] = [];
  for (const p of products) {
    const price = parsePrice(p.price);
    if (price !== null && price > 0) {
      candidates.push({
        title: p.title,
        price,
        url: p.url,
        imageUrl: p.imageUrl || "https://via.placeholder.com/200",
        source: "google_shopping",
      });
    }
  }

  return candidates;
}

// Main search function
export async function searchProducts(
  query: string,
  budget: number
): Promise<ProductSearchResult> {
  const browser = await getBrowser();
  const page = await createStealthPage(browser);

  try {
    console.log(`[Search] Searching for: "${query}" with budget: $${budget}`);

    // Search Google Shopping
    const allCandidates = await scrapeGoogleShopping(page, query);

    console.log(`[Search] Found ${allCandidates.length} total products`);

    // Filter by budget and sort by price descending
    const withinBudget = allCandidates
      .filter((p) => p.price <= budget)
      .sort((a, b) => b.price - a.price);

    console.log(`[Search] ${withinBudget.length} products within budget`);

    // Select best (highest price within budget) and keep alternatives
    const selected = withinBudget[0] || null;
    const alternatives = withinBudget.slice(1);

    return {
      query,
      budget,
      selected,
      alternatives,
    };
  } catch (error) {
    console.error("[Search] Error during product search:", error);
    return {
      query,
      budget,
      selected: null,
      alternatives: [],
    };
  } finally {
    await page.close();
  }
}

// Get next cheaper alternative
export function getNextAlternative(
  currentUrl: string,
  alternatives: ProductCandidate[]
): ProductCandidate | null {
  // Find the current product index and return the next one
  const currentIndex = alternatives.findIndex((p) => p.url === currentUrl);
  if (currentIndex >= 0 && currentIndex < alternatives.length - 1) {
    return alternatives[currentIndex + 1];
  }
  // If current not found, return the first alternative
  return alternatives[0] || null;
}

// Cleanup function to be called when done
export async function cleanupSearch(): Promise<void> {
  await closeBrowser();
}

