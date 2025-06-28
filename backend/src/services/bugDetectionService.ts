import puppeteer from "puppeteer";

export interface ButtonClickResult {
  selector: string;
  textContent: string;
  navigated: boolean;
  urlBefore: string;
  urlAfter: string;
  contentChanged: boolean;
  bugType?: string;
  description?: string;
}

export async function analyzeButtonClicks(
  url: string
): Promise<ButtonClickResult[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const results: ButtonClickResult[] = [];

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Get all button selectors and text
    const buttons = await page.$$eval("button", (nodes) =>
      nodes.map((el, idx) => ({
        selector: `button:nth-of-type(${idx + 1})`,
        textContent: (el as HTMLElement).innerText,
      }))
    );

    for (const btn of buttons) {
      // Reload the page for each button to reset state
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      const urlBefore = page.url();
      const contentBefore = await page.content();

      // Try clicking the button
      let navigated = false;
      let contentChanged = false;
      let urlAfter = urlBefore;
      let bugType: string | undefined;
      let description: string | undefined;

      try {
        await page.waitForSelector(btn.selector, { timeout: 2000 });
        await page.click(btn.selector);
        // Wait for possible navigation or content change
        await new Promise((resolve) => setTimeout(resolve, 2000));

        urlAfter = page.url();
        navigated = urlAfter !== urlBefore;

        const contentAfter = await page.content();
        contentChanged = contentAfter !== contentBefore;

        // Check if the button's text implies navigation or content change
        if (!navigated && !contentChanged) {
          bugType = "NoAction";
          description = `Button \"${btn.textContent}\" did not cause navigation or visible content change.`;
        }
      } catch (e) {
        bugType = "ClickError";
        description = `Error clicking button \"${btn.textContent}\": ${
          (e as Error).message
        }`;
      }

      results.push({
        ...btn,
        navigated,
        urlBefore,
        urlAfter,
        contentChanged,
        bugType,
        description,
      });
    }
  } finally {
    await browser.close();
  }

  return results;
}
