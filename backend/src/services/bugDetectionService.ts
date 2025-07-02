import puppeteer, { Browser, Page } from "puppeteer";

export interface ButtonClickResult {
  selector: string;
  textContent: string;
  navigated: boolean;
  urlBefore: string;
  urlAfter: string;
  contentChanged: boolean;
  bugType?: string;
  description?: string;
  elementType: "button" | "link" | "custom";
  isVisible: boolean;
  wasClicked: boolean;
}

/**
 * If you encounter persistent EPERM errors on Windows, try running this script as administrator
 * and whitelist your temp directory in your antivirus/Windows Defender settings.
 */
export async function analyzeButtonClicks(
  url: string
): Promise<ButtonClickResult[]> {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: any = null;
  const analysisStart = Date.now();
  let browser: Browser | null = null;

  // Helper to inject data-analyzer-id attributes into all buttons and links in the current DOM
  async function injectAnalyzerAttributes(page: Page) {
    await page.evaluate(() => {
      /**
       * @param {HTMLElement} element
       */
      function isVisibleAndInteractive(element: any) {
        const el = element as HTMLElement;
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (
          el.offsetParent === null ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          style.pointerEvents === "none"
        ) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        // Disabled
        if (
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true"
        )
          return false;
        return true;
      }

      // Collect all potentially interactive elements
      const candidates = new Set<HTMLElement>();
      // <a> and <button>
      document
        .querySelectorAll("a, button")
        .forEach((el) => candidates.add(el as HTMLElement));
      // [role=button]
      document
        .querySelectorAll('[role="button"]')
        .forEach((el) => candidates.add(el as HTMLElement));
      // [tabindex]:not([tabindex='-1'])
      document
        .querySelectorAll('[tabindex]:not([tabindex="-1"])')
        .forEach((el) => candidates.add(el as HTMLElement));
      // [onclick]
      document
        .querySelectorAll("[onclick]")
        .forEach((el) => candidates.add(el as HTMLElement));
      // Elements with cursor:pointer, but only if also interactive
      Array.from(document.querySelectorAll("*"))
        .filter(
          (el) =>
            window.getComputedStyle(el as HTMLElement).cursor === "pointer"
        )
        .forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Only add if also has onclick, or is focusable/semantically interactive
          const hasOnClick = htmlEl.hasAttribute("onclick");
          const hasTabindex =
            htmlEl.hasAttribute("tabindex") &&
            htmlEl.getAttribute("tabindex") !== "-1";
          const isSemantic =
            ["a", "button"].includes(htmlEl.tagName.toLowerCase()) ||
            htmlEl.getAttribute("role") === "button";
          // Try to detect registered event listeners (best effort)
          let hasListener = false;
          // @ts-ignore
          if (typeof getEventListeners === "function") {
            // @ts-ignore
            const listeners = getEventListeners(htmlEl);
            if (listeners && listeners.click && listeners.click.length > 0) {
              hasListener = true;
            }
          }
          if (hasOnClick || hasTabindex || isSemantic || hasListener) {
            candidates.add(htmlEl);
          }
        });

      let buttonIdx = 0,
        linkIdx = 0,
        customIdx = 0;
      candidates.forEach((element) => {
        const el = element as HTMLElement;
        // Expert-level: Only assign if truly clickable and not already assigned
        if (!isVisibleAndInteractive(el)) {
          // Uncomment for debug: console.log('[DEBUG][injectAnalyzerAttributes] Skipping not visible/interactable:', el);
          return;
        }
        // Only assign to <button>, <a>, [role=button], or [tabindex] (not generic containers)
        const tag = el.tagName.toLowerCase();
        const isButton = tag === "button";
        const isLink = tag === "a";
        const isRoleButton = el.getAttribute("role") === "button";
        const hasTabindex =
          el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1";
        if (!(isButton || isLink || isRoleButton || hasTabindex)) {
          // Uncomment for debug: console.log('[DEBUG][injectAnalyzerAttributes] Skipping generic container:', el);
          return;
        }
        if (el.hasAttribute("data-analyzer-id")) {
          // Uncomment for debug: console.log('[DEBUG][injectAnalyzerAttributes] Already assigned:', el);
          return;
        }
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute("aria-label");
        const title = el.getAttribute("title");
        const hasIcon = el.querySelector(
          "img, svg, i, [class*='icon'], [class*='fa-']"
        );
        // Only assign if it has some content or icon
        if (!(text || ariaLabel || title || hasIcon)) return;
        // Assign data-analyzer-id and elementType
        if (isButton) {
          el.setAttribute("data-analyzer-id", `button-${buttonIdx++}`);
          el.setAttribute("data-analyzer-type", "button");
        } else if (isLink) {
          el.setAttribute("data-analyzer-id", `link-${linkIdx++}`);
          el.setAttribute("data-analyzer-type", "link");
        } else {
          el.setAttribute("data-analyzer-id", `custom-${customIdx++}`);
          el.setAttribute("data-analyzer-type", "custom");
        }
      });
    });
  }

  // Helper to get all clickable selectors in the current DOM (buttons, links, and custom)
  async function getClickableSelectors(
    page: Page
  ): Promise<
    { selector: string; elementType: "button" | "link" | "custom" }[]
  > {
    return await page.evaluate(() => {
      const result: {
        selector: string;
        elementType: "button" | "link" | "custom";
      }[] = [];
      const all = document.querySelectorAll("[data-analyzer-id]");
      all.forEach((el) => {
        const type = el.getAttribute("data-analyzer-type") as
          | "button"
          | "link"
          | "custom";
        result.push({
          selector: `[data-analyzer-id='${el.getAttribute(
            "data-analyzer-id"
          )}']`,
          elementType: type || "custom",
        });
      });
      return result;
    });
  }

  // Helper to proactively identify auth-related elements
  function isAuthElement(href: string | undefined, label: string): boolean {
    const authKeywords = [
      "login",
      "signin",
      "sign in",
      "logout",
      "signout",
      "sign out",
      "register",
      "signup",
      "sign up",
      "account",
      "profile",
      "my account",
      "my profile",
      "start learning",
      "continue with",
    ];
    const authUrlPatterns = [
      "/auth",
      "/login",
      "/signin",
      "/register",
      "/signup",
      "/account",
    ];
    const lowerLabel = label.toLowerCase();

    if (authKeywords.some((word) => lowerLabel.includes(word))) {
      return true;
    }

    if (href) {
      try {
        const urlPath = new URL(href, "http://dummybase").pathname;
        if (authUrlPatterns.some((pattern) => urlPath.startsWith(pattern))) {
          return true;
        }
      } catch (e) {
        // Ignore invalid URLs for this check
      }
    }

    return false;
  }

  // Helper to detect if the current page is an auth page
  async function isAuthPage(page: Page): Promise<boolean> {
    const url = page.url();
    if (/\\b(auth|login|signin|register|signup|account)\\b/i.test(url)) {
      return true;
    }
    // Look for a visible form with both email and password fields
    return await page.evaluate(() => {
      // Find all visible forms
      const forms = Array.from(document.querySelectorAll("form")).filter(
        (form) => {
          const style = window.getComputedStyle(form);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            (form as HTMLElement).offsetParent !== null
          );
        }
      );
      for (const form of forms) {
        const emailInput = form.querySelector(
          'input[type="email"], input[placeholder*="email" i], input[placeholder*="@" i]'
        );
        const passInput = form.querySelector(
          'input[type="password"], input[placeholder*="pass" i], input[placeholder*="*" i]'
        );
        if (emailInput && passInput) return true;
      }
      // Also check for a visible button with 'sign in' or 'login'
      const buttons = Array.from(
        document.querySelectorAll('button, input[type="submit"]')
      ).filter((btn) => {
        const style = window.getComputedStyle(btn);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          (btn as HTMLElement).offsetParent !== null
        );
      });
      return buttons.some((btn) => {
        const text =
          (btn as HTMLElement).innerText?.toLowerCase() ||
          (btn as HTMLInputElement).value?.toLowerCase() ||
          "";
        return text.includes("sign in") || text.includes("login");
      });
    });
  }

  // Helper to handle auth page logic
  async function handleAuthPage(
    page: Page,
    results: ButtonClickResult[],
    originalUrl: string,
    visited: Set<string>
  ) {
    console.log(
      "[DEBUG][AuthHandler] Starting auth page handling for:",
      page.url()
    );
    // Try to find and click the sign in button, fill credentials, and check for invalid credentials
    const signInSelectors = [
      'button, input[type="submit"], [role="button"]',
      "a",
    ];
    let foundSignIn = false;
    let foundSignUp = false;
    let signInResult: ButtonClickResult | null = null;
    let signUpResult: ButtonClickResult | null = null;
    // Try to find sign in button
    for (const selector of signInSelectors) {
      const elements = await page.$$(selector);
      for (const el of elements) {
        const text =
          (await page.evaluate((el) => {
            if ((el as HTMLElement).textContent)
              return (el as HTMLElement).textContent;
            if ((el as HTMLInputElement).value)
              return (el as HTMLInputElement).value;
            return "";
          }, el)) ?? "";
        const lowerText = text.toLowerCase();
        if (lowerText.includes("sign in") || lowerText.includes("login")) {
          foundSignIn = true;
          console.log(
            `[DEBUG][AuthHandler] Found sign in button: '${text}'. Attempting to fill credentials and sign in.`
          );
          // Fill email and password
          await fillAuthFields(page, "Relyqatest@gmail.com", "RelyQA@123");
          const urlBeforeSignIn = page.url();
          await el.click();
          console.log(
            "[DEBUG][AuthHandler] Clicked sign in button, waiting for response..."
          );
          // Wait for possible navigation or UI change
          const [response] = await Promise.all([
            page.waitForNavigation({ timeout: 5000 }).catch(() => null),
            new Promise((res) => setTimeout(res, 1500)),
          ]);
          const urlAfterSignIn = page.url();
          const navigatedAfterSignIn = urlAfterSignIn !== urlBeforeSignIn;
          // Check for invalid credentials message
          const invalid = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return (
              text.includes("invalid") ||
              text.includes("incorrect") ||
              text.includes("error")
            );
          });
          console.log(
            `[DEBUG][AuthHandler] Sign in attempt result: ${
              invalid
                ? "Invalid credentials detected"
                : "No invalid credentials message"
            }`
          );
          signInResult = {
            selector: selector,
            textContent: lowerText,
            navigated: navigatedAfterSignIn,
            urlBefore: urlBeforeSignIn,
            urlAfter: urlAfterSignIn,
            contentChanged: true,
            bugType: invalid ? undefined : "NoInvalidCredentialsMessage",
            description: invalid
              ? "Invalid credentials message shown."
              : "No invalid credentials message after failed login.",
            elementType: "button",
            isVisible: true,
            wasClicked: true,
          };
          results.push(signInResult);
          if (navigatedAfterSignIn) {
            console.log(
              `[DEBUG][AuthHandler] Navigation detected after sign in. Starting button analysis on new page: ${urlAfterSignIn}`
            );
            await analyzePage(page, urlAfterSignIn, visited, results);
            return;
          }
        }
      }
      if (foundSignIn) break;
    }
    // If sign in failed, try sign up/register
    if (!foundSignIn || (signInResult && signInResult.bugType === undefined)) {
      for (const selector of signInSelectors) {
        const elements = await page.$$(selector);
        for (const el of elements) {
          const text =
            (await page.evaluate((el) => {
              if ((el as HTMLElement).textContent)
                return (el as HTMLElement).textContent;
              if ((el as HTMLInputElement).value)
                return (el as HTMLInputElement).value;
              return "";
            }, el)) ?? "";
          const lowerText = text.toLowerCase();
          if (lowerText.includes("sign up") || lowerText.includes("register")) {
            foundSignUp = true;
            console.log(
              `[DEBUG][AuthHandler] Found sign up/register button: '${text}'. Clicking to open registration form.`
            );
            await el.click();
            await new Promise((res) => setTimeout(res, 1500));
            // Check for UI change (e.g., new form fields)
            const hasUsername = await page.evaluate(() => {
              return !!document.querySelector(
                'input[name*="user" i], input[placeholder*="user" i], input[aria-label*="user" i]'
              );
            });
            if (!hasUsername) {
              console.log(
                "[DEBUG][AuthHandler] No UI change detected after clicking sign up/register. Reporting bug."
              );
              // No UI change, report bug
              signUpResult = {
                selector: selector,
                textContent: lowerText,
                navigated: false,
                urlBefore: page.url(),
                urlAfter: page.url(),
                contentChanged: false,
                bugType: "NoUIChangeOnSignUp",
                description: "No UI change after clicking sign up/register.",
                elementType: "button",
                isVisible: true,
                wasClicked: true,
              };
              results.push(signUpResult);
              return;
            }
            console.log(
              "[DEBUG][AuthHandler] Registration form detected. Filling sign up fields."
            );
            // Fill sign up fields
            await fillSignUpFields(page);
            // Try to find and click the submit/sign up button again
            for (const subSelector of signInSelectors) {
              const subElements = await page.$$(subSelector);
              for (const subEl of subElements) {
                const subText =
                  (await page.evaluate((el) => {
                    if ((el as HTMLElement).textContent)
                      return (el as HTMLElement).textContent;
                    if ((el as HTMLInputElement).value)
                      return (el as HTMLInputElement).value;
                    return "";
                  }, subEl)) ?? "";
                const lowerSubText = subText.toLowerCase();
                if (
                  lowerSubText.includes("sign up") ||
                  lowerSubText.includes("register")
                ) {
                  console.log(
                    `[DEBUG][AuthHandler] Clicking submit/register button: '${subText}'.`
                  );
                  await subEl.click();
                  await new Promise((res) => setTimeout(res, 1500));
                  break;
                }
              }
            }
            // After sign up, try to sign in again
            console.log(
              "[DEBUG][AuthHandler] Sign up flow complete. Attempting sign in again."
            );
            await handleAuthPage(page, results, originalUrl, visited);
            return;
          }
        }
        if (foundSignUp) break;
      }
    }
  }

  // Helper to fill sign in fields
  async function fillAuthFields(page: Page, email: string, password: string) {
    console.log(`[DEBUG][AuthHandler] Starting advanced auth handler.`);

    const frames = page.frames();
    let filledEmail = false,
      filledPassword = false;

    for (const frame of frames) {
      try {
        // Wait for a visible email input in the frame
        const emailField = await frame
          .waitForSelector(
            'input[type="email"], input[placeholder*="email" i], input[placeholder*="@" i]',
            { visible: true, timeout: 10000 }
          )
          .catch(() => null);

        if (emailField) {
          await emailField.click({ clickCount: 3 });
          await emailField.type(email, { delay: 50 });
          console.log(
            `[DEBUG][AuthHandler] Filled email field in frame: ${frame.url()} with value: ${email}`
          );
          filledEmail = true;
        }

        // Wait for a visible password input in the frame
        const passField = await frame
          .waitForSelector(
            'input[type="password"], input[placeholder*="pass" i], input[placeholder*="*" i]',
            { visible: true, timeout: 10000 }
          )
          .catch(() => null);

        if (passField) {
          await passField.click({ clickCount: 3 });
          await passField.type(password, { delay: 50 });
          console.log(
            `[DEBUG][AuthHandler] Filled password field in frame: ${frame.url()} with value: ${password}`
          );
          filledPassword = true;
        }
      } catch (error) {
        console.log(
          `[DEBUG][AuthHandler] Error filling fields in frame ${frame.url()}: ${error}`
        );
      }
    }

    if (!filledEmail) {
      console.log(
        "[DEBUG][AuthHandler] No matching email field found to fill in any frame."
      );
    }
    if (!filledPassword) {
      console.log(
        "[DEBUG][AuthHandler] No matching password field found to fill in any frame."
      );
    }
  }

  // Helper to fill sign up fields
  async function fillSignUpFields(page: Page) {
    // Username
    const usernameSelectors = [
      'input[name*="user" i]',
      'input[placeholder*="user" i]',
      'input[aria-label*="user" i]',
    ];
    let filledUsername = false;
    for (const sel of usernameSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type("RelyQA", { delay: 50 });
        filledUsername = true;
        console.log(
          `[DEBUG][AuthHandler] Filled username field using selector: ${sel}`
        );
        break;
      }
    }
    if (!filledUsername) {
      console.log("[DEBUG][AuthHandler] No username field found to fill.");
    }
    // Email
    await fillAuthFields(page, "Relyqatest@gmail.com", "RelyQA@123");
    // Confirm Password
    const confirmSelectors = [
      'input[name*="confirm" i]',
      'input[placeholder*="confirm" i]',
      'input[aria-label*="confirm" i]',
    ];
    let filledConfirm = false;
    for (const sel of confirmSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type("RelyQA@123", { delay: 50 });
        filledConfirm = true;
        console.log(
          `[DEBUG][AuthHandler] Filled confirm password field using selector: ${sel}`
        );
        break;
      }
    }
    if (!filledConfirm) {
      console.log(
        "[DEBUG][AuthHandler] No confirm password field found to fill."
      );
    }
  }

  // Helper to normalize a URL by stripping its hash/fragment
  function normalizeUrl(urlString: string, base?: string): string {
    try {
      // Use the base if provided, otherwise use a dummy base for relative URLs
      const url = new URL(urlString, base || "http://dummybase.com");
      url.hash = ""; // Strip the fragment
      return url.href;
    } catch (e) {
      // Handle invalid URLs gracefully
      return urlString;
    }
  }

  // Helper to test all search fields on a page
  async function analyzeSearchFields(
    page: Page,
    currentUrl: string,
    results: ButtonClickResult[]
  ) {
    // Find all input[type=search], input[placeholder*='search'], input[aria-label*='search'], [role=search] input
    const searchSelectors = await page.evaluate(() => {
      const selectors: string[] = [];
      document
        .querySelectorAll(
          'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i], [role="search"] input'
        )
        .forEach((el, idx) => {
          if (el instanceof HTMLInputElement) {
            selectors.push(`input[data-search-analyzer-id='search-${idx}']`);
            el.setAttribute("data-search-analyzer-id", `search-${idx}`);
          }
        });
      return selectors;
    });
    for (const selector of searchSelectors) {
      let urlBefore = page.url();
      let navigated = false;
      let urlAfter = urlBefore;
      let error: string | undefined = undefined;
      let wasSearched = false;
      let contentChanged = false;
      let bugType: string | undefined = undefined;
      let description: string | undefined = undefined;
      let textContent = "Hello";
      try {
        // Before state
        const stateBefore = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll("[aria-expanded]")
          ).map((el) => el.getAttribute("aria-expanded")),
        }));
        // Focus and type 'Hello'
        await page.focus(selector);
        await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el) el.value = "";
        }, selector);
        await page.type(selector, "Hello", { delay: 50 });
        // Try to submit by pressing Enter
        await page.keyboard.press("Enter");
        // Wait for possible navigation or UI change
        const [response] = await Promise.all([
          page.waitForNavigation({ timeout: 3000 }).catch(() => null),
          new Promise((res) => setTimeout(res, 1000)),
        ]);
        urlAfter = page.url();
        navigated = urlAfter !== urlBefore;
        // After state
        const stateAfter = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll("[aria-expanded]")
          ).map((el) => el.getAttribute("aria-expanded")),
        }));
        contentChanged =
          stateBefore.htmlLength !== stateAfter.htmlLength ||
          JSON.stringify(stateBefore.expanded) !==
            JSON.stringify(stateAfter.expanded);
        wasSearched = true;
        if (!navigated && !contentChanged) {
          bugType = "NoSearchEffect";
          description = `Search field '${selector}' did not cause navigation or UI change when searching for 'Hello'.`;
          console.log(`[DEBUG]  BUG: ${description}`);
        }
        results.push({
          selector,
          textContent,
          navigated,
          urlBefore,
          urlAfter,
          contentChanged,
          bugType,
          description,
          elementType: "custom",
          isVisible: true,
          wasClicked: wasSearched,
        });
      } catch (e: any) {
        error = e.message;
        results.push({
          selector,
          textContent,
          navigated,
          urlBefore,
          urlAfter,
          contentChanged: false,
          bugType: "SearchError",
          description: error,
          elementType: "custom",
          isVisible: true,
          wasClicked: false,
        });
      }
    }
  }

  // Recursive depth-first analysis function for both buttons and links
  async function analyzePage(
    page: Page,
    currentUrl: string,
    visited: Set<string>,
    results: ButtonClickResult[]
  ): Promise<void> {
    const normalizedUrl = normalizeUrl(currentUrl);
    if (visited.has(normalizedUrl)) {
      console.log(`[DEBUG] Skipping already visited URL: ${currentUrl}`);
      return;
    }
    visited.add(normalizedUrl);
    console.log(`[DEBUG]  Analyzing page: ${currentUrl}`);
    await injectAnalyzerAttributes(page);
    await analyzeSearchFields(page, currentUrl, results);
    // If this is an auth page, handle auth logic and skip normal clickable analysis
    if (await isAuthPage(page)) {
      console.log(
        `[DEBUG] Detected auth page: ${currentUrl}. Running auth handler.`
      );
      await handleAuthPage(page, results, currentUrl, visited);
      return;
    }
    const clickableElements = await getClickableSelectors(page);
    console.log(
      `[DEBUG]  Found ${clickableElements.length} clickable elements on page: ${currentUrl}`
    );
    const footerTestedSet = new Set<string>();
    for (let i = 0; i < clickableElements.length; i++) {
      const { selector, elementType } = clickableElements[i];
      let urlBefore = page.url();
      let navigated = false;
      let urlAfter = urlBefore;
      let error: string | undefined = undefined;
      let wasClicked = false;
      let textContent = "";
      let elementLabel = "";
      let href: string | undefined = undefined;
      try {
        // Try to get visible text
        textContent = await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          return el ? el.textContent?.trim() || "" : "";
        }, selector);
        // If no visible text, try aria-label, title, or type
        if (!textContent) {
          elementLabel = await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return (
              el?.getAttribute("aria-label") ||
              el?.getAttribute("title") ||
              el?.getAttribute("type") ||
              sel
            );
          }, selector);
        } else {
          elementLabel = textContent;
        }
        // Always append element type for clarity
        elementLabel = elementLabel
          ? `${elementLabel} ${elementType}`
          : selector;
        // For <a> elements, get href
        if (elementType === "link") {
          href = await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return el ? el.getAttribute("href") || undefined : undefined;
          }, selector);
          // Skip external links
          if (
            href &&
            !href.startsWith("#") &&
            !href.startsWith("javascript:")
          ) {
            let isExternal = false;
            try {
              const base = new URL(currentUrl);
              const resolved = new URL(href, base);
              isExternal = resolved.origin !== base.origin;
            } catch (e) {
              // If URL parsing fails, treat as external for safety
              isExternal = true;
            }
            if (isExternal) {
              console.log(
                `[DEBUG] [${new Date().toISOString()}] Skipping external link ${elementLabel} (${href})`
              );
              continue;
            }
          }
        }
        // Skip buttons/links with 'plan' or 'manage subscription' in the label
        const lowerLabel = elementLabel.toLowerCase();
        if (
          lowerLabel.includes("plan") ||
          lowerLabel.includes("subscription")
        ) {
          console.log(
            `[DEBUG] Skipping ${elementType} ${elementLabel} because it contains 'plan' or 'manage subscription'.`
          );
          continue;
        }
        const hasLabelOrIcon = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          // Check for visible text
          if (el.textContent && el.textContent.trim().length > 0) return true;
          // Check for aria-label or title
          if (el.getAttribute("aria-label") || el.getAttribute("title"))
            return true;
          // Check for SVG/icon child
          if (el.querySelector("svg")) return true;
          return false;
        }, selector);
        if (!hasLabelOrIcon) {
          console.log(
            `[DEBUG] Skipping ${elementType} ${selector} (no label or icon)`
          );
          continue;
        }
        const isInFooter = await page.evaluate((sel) => {
          let el = document.querySelector(sel);
          while (el) {
            if (
              el.tagName.toLowerCase() === "footer" ||
              el.className.includes("footer")
            )
              return true;
            el = el.parentElement;
          }
          return false;
        }, selector);
        const footerKey = `${elementType}:${elementLabel}`;
        if (isInFooter) {
          if (footerTestedSet.has(footerKey)) {
            console.log(
              `[DEBUG] Skipping already tested footer nav: ${footerKey}`
            );
            continue;
          }
          footerTestedSet.add(footerKey);
        }
        // Before click, capture a more detailed state of the page (expert-level)
        const stateBefore = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll("[aria-expanded]")
          ).map((el) => el.getAttribute("aria-expanded")),
        }));
        // Use improved label in logs
        console.log(
          `[DEBUG]  Clicking ${elementType} ${elementLabel} on ${urlBefore}...`
        );
        const [response] = await Promise.all([
          page.waitForNavigation({ timeout: 3000 }).catch(() => null),
          page.click(selector, { delay: 50 }).catch((e) => {
            error = e.message;
            return null;
          }),
        ]);
        wasClicked = !error;
        urlAfter = page.url();
        navigated = urlAfter !== urlBefore;
        if (navigated) {
          console.log(
            `[DEBUG] Navigation detected after clicking ${elementLabel}. New URL: ${urlAfter}`
          );
          // Check for 404 error after navigation
          const error404 = await page.evaluate(() => {
            const text = document.body.innerText;
            return (
              /404|non-existent route|not found/i.test(text) ||
              Array.from(document.querySelectorAll("*")).some(
                (el) =>
                  el.textContent &&
                  /404|non-existent route|not found/i.test(el.textContent)
              )
            );
          });
          if (error404) {
            console.log(
              "[DEBUG][BugDetection] 404 error detected after navigation. Reporting as bug."
            );
            results.push({
              selector: elementLabel,
              textContent,
              navigated,
              urlBefore,
              urlAfter,
              contentChanged: true,
              bugType: "404Error",
              description:
                "Navigated to a page with a 404 or non-existent route error.",
              elementType,
              isVisible: true,
              wasClicked,
            });
            // Optionally, go back to previous page
            await page
              .goBack({ waitUntil: "networkidle2", timeout: 10000 })
              .catch(() => null);
            await injectAnalyzerAttributes(page);
            continue;
          }
        } else {
          console.log(`[DEBUG]  No navigation after clicking ${elementLabel}.`);
        }
        // After click, allow time for UI changes and capture state again (expert-level)
        await new Promise((res) => setTimeout(res, 1000));
        const stateAfter = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll("[aria-expanded]")
          ).map((el) => el.getAttribute("aria-expanded")),
        }));

        // Check for dropdown and sub-buttons
        const isDropdown = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          // Heuristic: aria-haspopup, aria-expanded, or class contains 'dropdown'
          return (
            el.getAttribute("aria-haspopup") === "true" ||
            el.getAttribute("aria-expanded") === "true" ||
            (el.className && el.className.toLowerCase().includes("dropdown"))
          );
        }, selector);
        if (isDropdown) {
          console.log(
            `[DEBUG][Dropdown] Detected dropdown button: ${elementLabel}. Checking sub-buttons inside dropdown.`
          );
          // Wait for dropdown to open
          await new Promise((res) => setTimeout(res, 500));
          // Find sub-buttons/links inside the dropdown (excluding the toggle itself)
          const subSelectors = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return [];
            // Find all buttons/links inside the dropdown menu that are not the toggle
            const dropdownMenu = el.parentElement?.querySelector(
              '[role="menu"], .dropdown-menu, ul, div'
            );
            if (!dropdownMenu) return [];
            const subs = Array.from(
              dropdownMenu.querySelectorAll('button, a, [role="menuitem"]')
            );
            // Exclude the toggle button itself
            return subs
              .filter((sub) => sub !== el)
              .map((sub) => {
                // Try to create a unique selector for each sub-button
                if (sub.hasAttribute("data-analyzer-id")) {
                  return `[data-analyzer-id='${sub.getAttribute(
                    "data-analyzer-id"
                  )}']`;
                }
                // Fallback: nth-child selector
                const idx =
                  Array.from(sub.parentNode?.children || []).indexOf(sub) + 1;
                return `${sub.tagName.toLowerCase()}:nth-child(${idx})`;
              });
          }, selector);
          for (const subSel of subSelectors) {
            // Only check sub-buttons, not the dropdown toggle
            if (subSel === selector) continue;
            let subTextContent = await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return el ? el.textContent?.trim() || "" : "";
            }, subSel);
            let subStateBefore = await page.evaluate(() => ({
              htmlLength: document.body.outerHTML.length,
              expanded: Array.from(
                document.querySelectorAll("[aria-expanded]")
              ).map((el) => el.getAttribute("aria-expanded")),
            }));
            await page.click(subSel, { delay: 50 }).catch(() => null);
            await new Promise((res) => setTimeout(res, 1000));
            let subStateAfter = await page.evaluate(() => ({
              htmlLength: document.body.outerHTML.length,
              expanded: Array.from(
                document.querySelectorAll("[aria-expanded]")
              ).map((el) => el.getAttribute("aria-expanded")),
            }));
            const subContentChanged =
              subStateBefore.htmlLength !== subStateAfter.htmlLength ||
              JSON.stringify(subStateBefore.expanded) !==
                JSON.stringify(subStateAfter.expanded);
            if (!subContentChanged) {
              results.push({
                selector: subSel,
                textContent: subTextContent,
                navigated: false,
                urlBefore: page.url(),
                urlAfter: page.url(),
                contentChanged: false,
                bugType: "DropdownSubButtonNoEffect",
                description:
                  "Dropdown sub-button did not cause navigation or UI change.",
                elementType: "button",
                isVisible: true,
                wasClicked: true,
              });
              console.log(
                `[DEBUG][Dropdown] Sub-button ${subSel} did not cause UI change or navigation. Reported as bug.`
              );
            } else {
              console.log(
                `[DEBUG][Dropdown] Sub-button ${subSel} caused UI change or navigation.`
              );
            }
          }
        }
        // Compare state to see if any meaningful UI change occurred
        const contentChanged =
          stateBefore.htmlLength !== stateAfter.htmlLength ||
          JSON.stringify(stateBefore.expanded) !==
            JSON.stringify(stateAfter.expanded);
        if (contentChanged && !navigated) {
          console.log(
            `[DEBUG] UI content changed after clicking ${elementLabel}, but no navigation.`
          );
        }
        // Bug detection for navigation-expected elements
        let bugType: string | undefined = error ? "ClickError" : undefined;
        let description: string | undefined = error;
        if (!navigated && !error && !contentChanged) {
          const isLinkToCurrentPage =
            elementType === "link" && href
              ? normalizeUrl(href, urlBefore) === normalizedUrl
              : false;

          if (!navigated && !error && !contentChanged && !isLinkToCurrentPage) {
            bugType = "NoNavigation";
            description = `${
              elementType === "link" ? "Link" : "Button"
            } '${elementLabel}' did not navigate or change content as expected.`;
            console.log(`[DEBUG]  BUG: ${description}`);
          }
        }
        results.push({
          selector: elementLabel, // Use improved label in results
          textContent,
          navigated,
          urlBefore,
          urlAfter,
          contentChanged,
          bugType,
          description,
          elementType,
          isVisible: true, // Assumed true because it passed the initial filter
          wasClicked,
        });
        console.log(
          `[DEBUG]  Result pushed for ${elementType} ${elementLabel}.`
        );
        // If navigation and new URL not visited, recurse
        if (navigated && !visited.has(normalizeUrl(urlAfter))) {
          await analyzePage(page, urlAfter, visited, results);
          // After recursion, go back to previous page
          console.log(`[DEBUG]  Returning to previous page: ${urlBefore}`);
          await page
            .goBack({ waitUntil: "networkidle2", timeout: 10000 })
            .catch(() => null);
          await injectAnalyzerAttributes(page); // Re-inject after going back
        } else if (navigated && visited.has(normalizeUrl(urlAfter))) {
          // If navigated to already visited page, go back immediately
          console.log(
            `[DEBUG] [${new Date().toISOString()}] Navigated to already visited page: ${urlAfter}, going back.`
          );
          await page
            .goBack({ waitUntil: "networkidle2", timeout: 10000 })
            .catch(() => null);
          await injectAnalyzerAttributes(page);
        }
      } catch (e: any) {
        error = e.message;
        console.log(
          `[DEBUG] [${new Date().toISOString()}] Error clicking ${elementType} ${selector}: ${error}`
        );
        results.push({
          selector,
          textContent,
          navigated,
          urlBefore,
          urlAfter,
          contentChanged: false,
          bugType: "ClickError",
          description: error,
          elementType,
          isVisible: true,
          wasClicked: false,
        });
      }
    }
  }

  while (attempt < maxRetries) {
    try {
      browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-features=NetworkService",
          "--disable-extensions", // Disable all browser extensions for a clean profile
        ],
        // Do NOT set userDataDir to ensure a fresh profile is used
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      const results: ButtonClickResult[] = [];
      const visited = new Set<string>();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((res) => setTimeout(res, 2000));
      await analyzePage(page, url, visited, results);
      const analysisEnd = Date.now();
      console.log(
        `[DEBUG] [${new Date().toISOString()}] Analysis complete. Found ${
          results.length
        } elements, ${
          results.filter((r) => r.bugType).length
        } potential issues. Total time: ${
          (analysisEnd - analysisStart) / 1000
        }s`
      );
      try {
        await browser.close();
        console.log(
          `[DEBUG] [${new Date().toISOString()}] Browser closed successfully.`
        );
      } catch (closeErr: any) {
        if (closeErr.code === "EPERM" || closeErr.code === "EACCES") {
          console.warn(
            "[DEBUG] Non-fatal warning: Could not clean up Puppeteer temp files due to permissions. Consider running as administrator or whitelisting temp directory in antivirus."
          );
        } else {
          throw closeErr;
        }
      }
      return results;
    } catch (error: any) {
      lastError = error;
      attempt++;
      if (
        error.code === "EPERM" ||
        error.code === "EACCES" ||
        (error.message && error.message.includes("operation not permitted"))
      ) {
        console.warn(
          `[DEBUG] EPERM or file system error on attempt ${attempt}. Retrying after delay...`
        );
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      } else {
        break;
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log(
            `[DEBUG] [${new Date().toISOString()}] Browser closed in finally block.`
          );
        } catch (closeErr: any) {
          if (closeErr.code === "EPERM" || closeErr.code === "EACCES") {
            console.warn(
              "[DEBUG] Non-fatal warning: Could not clean up Puppeteer temp files due to permissions. Consider running as administrator or whitelisting temp directory in antivirus."
            );
          } else {
            console.warn(
              "[DEBUG] Non-fatal warning on browser.close():",
              closeErr
            );
          }
        }
      }
    }
  }
  throw lastError;
}
