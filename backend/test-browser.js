const puppeteer = require("puppeteer");

async function testBrowser() {
  console.log("🧪 Testing browser functionality...");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      timeout: 60000,
      protocolTimeout: 60000,
    });

    console.log("✅ Browser launched successfully");

    const page = await browser.newPage();
    console.log("✅ Page created successfully");

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    console.log("✅ Timeouts set successfully");

    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    console.log("✅ Navigation successful");

    const title = await page.title();
    console.log(`✅ Page title: ${title}`);

    await browser.close();
    console.log("✅ Browser closed successfully");

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testBrowser();
