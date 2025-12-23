import { getBrowser, createStealthPage } from "./agent";

export interface CheckoutResult {
  success: boolean;
  status: "ordered" | "manual_required" | "failed";
  message: string;
}

// Helper to wait for a specified duration
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Attempt to add product to cart and checkout
export async function attemptCheckout(productUrl: string): Promise<CheckoutResult> {
  const browser = await getBrowser();
  const page = await createStealthPage(browser);

  try {
    console.log(`[Checkout] Navigating to: ${productUrl}`);

    await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Detect the site we're on
    const url = page.url();

    // Check if we hit a login wall or CAPTCHA
    const pageContent = await page.content();
    const hasLoginWall =
      pageContent.includes("sign in") ||
      pageContent.includes("Sign In") ||
      pageContent.includes("log in") ||
      pageContent.includes("Log In") ||
      pageContent.includes("captcha") ||
      pageContent.includes("CAPTCHA");

    if (hasLoginWall) {
      console.log("[Checkout] Login wall or CAPTCHA detected");
      return {
        success: false,
        status: "manual_required",
        message: "Login or verification required. Please complete purchase manually.",
      };
    }

    // Try to find and click "Add to Cart" button
    const addToCartSelectors = [
      'button[id*="add-to-cart"]',
      'button[name*="add-to-cart"]',
      'button:has-text("Add to Cart")',
      'button:has-text("Add to Bag")',
      'input[value*="Add to Cart"]',
      '[data-action="add-to-cart"]',
      ".add-to-cart-button",
      "#add-to-cart-button",
    ];

    let addedToCart = false;
    for (const selector of addToCartSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          addedToCart = true;
          console.log(`[Checkout] Clicked add to cart with selector: ${selector}`);
          break;
        }
      } catch {
        // Try next selector
      }
    }

    if (!addedToCart) {
      console.log("[Checkout] Could not find Add to Cart button");
      return {
        success: false,
        status: "manual_required",
        message: `Could not automate purchase. Please buy manually: ${url}`,
      };
    }

    // Wait for cart update
    await wait(2000);

    // Try to proceed to checkout
    const checkoutSelectors = [
      'a[href*="checkout"]',
      'button:has-text("Checkout")',
      'button:has-text("Proceed to Checkout")',
      "#proceed-to-checkout",
      ".checkout-button",
    ];

    let foundCheckout = false;
    for (const selector of checkoutSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          foundCheckout = true;
          console.log(`[Checkout] Clicked checkout with selector: ${selector}`);
          break;
        }
      } catch {
        // Try next selector
      }
    }

    if (!foundCheckout) {
      return {
        success: false,
        status: "manual_required",
        message: "Added to cart but could not proceed to checkout automatically.",
      };
    }

    // Wait and check for payment/login requirements
    await wait(3000);
    const checkoutContent = await page.content();

    const requiresAuth =
      checkoutContent.includes("sign in") ||
      checkoutContent.includes("Sign In") ||
      checkoutContent.includes("password") ||
      checkoutContent.includes("Payment");

    if (requiresAuth) {
      return {
        success: false,
        status: "manual_required",
        message: "Checkout requires authentication or payment details. Please complete manually.",
      };
    }

    // For MVP, we stop here - actual order placement would require saved payment info
    return {
      success: false,
      status: "manual_required",
      message: "Cart ready for checkout. Please complete payment manually.",
    };
  } catch (error) {
    console.error("[Checkout] Error during checkout:", error);
    return {
      success: false,
      status: "failed",
      message: `Checkout failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    await page.close();
  }
}
