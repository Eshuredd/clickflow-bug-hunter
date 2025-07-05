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
 * Enhanced element state interface for comprehensive validation
 */
interface ElementState {
  exists: boolean;
  visible: boolean;
  clickable: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  zIndex: number;
  hasPointerEvents: boolean;
  isInViewport: boolean;
  isOccluded: boolean;
}

/**
 * Sidebar state detection and management
 */
interface SidebarState {
  isPresent: boolean;
  isOpen: boolean;
  type: "hamburger" | "persistent" | "overlay" | "none";
}

type DetectionLevel = "beginner" | "expert" | "master";

/**
 * If you encounter persistent EPERM errors on Windows, try running this script as administrator
 * and whitelist your temp directory in your antivirus/Windows Defender settings.
 */
export async function analyzeButtonClicks(
  url: string,
  onButtonScanned?: (button: {
    selector: string;
    textContent: string;
    elementType: string;
  }) => void,
  detectionLevel: DetectionLevel = "expert"
): Promise<ButtonClickResult[]> {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: any = null;
  const analysisStart = Date.now();
  const maxAnalysisTime = 5 * 60 * 1000; // 5 minutes max
  let browser: Browser | null = null;
  let analysisCompleted = false;
  let cachedSidebarState: SidebarState | null = null; // Cache for performance

  /**
   * Enhanced wait for element stability - optimized for speed
   */
  async function waitForElementStability(
    page: Page,
    selector: string,
    timeout = 2000
  ): Promise<boolean> {
    try {
      // Quick element check - reduced timeout
      await page.waitForSelector(selector, {
        visible: true,
        timeout: 1000,
      });

      // Minimal stability check for speed
      let previousBounds: any = null;
      let stableCount = 0;
      const requiredStableChecks = 2;

      for (let i = 0; i < 4; i++) {
        const currentBounds = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }, selector);

        if (!currentBounds) return false;

        if (
          previousBounds &&
          Math.abs(currentBounds.x - previousBounds.x) < 2 &&
          Math.abs(currentBounds.y - previousBounds.y) < 2 &&
          Math.abs(currentBounds.width - previousBounds.width) < 2 &&
          Math.abs(currentBounds.height - previousBounds.height) < 2
        ) {
          stableCount++;
          if (stableCount >= requiredStableChecks) {
            return true;
          }
        } else {
          stableCount = 0;
        }

        previousBounds = currentBounds;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      return stableCount >= requiredStableChecks;
    } catch (error) {
      return false;
    }
  }

  /**
   * Comprehensive element validation before attempting interaction
   */
  async function validateElementState(
    page: Page,
    selector: string
  ): Promise<ElementState> {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;

      if (!element) {
        return {
          exists: false,
          visible: false,
          clickable: false,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          zIndex: 0,
          hasPointerEvents: false,
          isInViewport: false,
          isOccluded: false,
        };
      }

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      // Check visibility
      const isVisible = !!(
        element.offsetParent !== null &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );

      // Check if in viewport
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      // Check for pointer events
      const hasPointerEvents = style.pointerEvents !== "none";

      // Check if element is clickable (not disabled)
      const isClickable = !(
        element.hasAttribute("disabled") ||
        element.getAttribute("aria-disabled") === "true" ||
        style.pointerEvents === "none"
      );

      // Check for occlusion by other elements
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      const isOccluded =
        elementAtPoint !== element && !element.contains(elementAtPoint);

      return {
        exists: true,
        visible: isVisible,
        clickable: isClickable,
        bounds: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        zIndex: parseInt(style.zIndex) || 0,
        hasPointerEvents,
        isInViewport,
        isOccluded,
      };
    }, selector);
  }

  /**
   * Detect and manage sidebar state for consistent testing
   */
  async function detectSidebarState(page: Page): Promise<SidebarState> {
    return (await page.evaluate(() => {
      // Common sidebar selectors
      const sidebarSelectors = [
        'nav[role="navigation"]',
        ".sidebar",
        ".nav-sidebar",
        ".side-nav",
        ".navigation",
        '[data-testid*="sidebar"]',
        ".menu-sidebar",
      ];

      // Common hamburger menu selectors
      const hamburgerSelectors = [
        ".hamburger",
        ".menu-toggle",
        ".nav-toggle",
        '[aria-label*="menu"]',
        ".mobile-menu-toggle",
        ".burger-menu",
      ];

      let sidebar: Element | null = null;
      for (const sel of sidebarSelectors) {
        sidebar = document.querySelector(sel);
        if (sidebar) break;
      }

      if (!sidebar) {
        return { isPresent: false, isOpen: false, type: "none" };
      }

      const style = window.getComputedStyle(sidebar);
      const rect = sidebar.getBoundingClientRect();

      // Determine if sidebar is open based on various indicators
      const isOpen = !!(
        rect.width > 50 && // Has reasonable width
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        (style.transform === "none" ||
          !style.transform.includes("translateX(-")) &&
        parseFloat(style.opacity) > 0.5
      );

      // Determine sidebar type
      let type: "hamburger" | "persistent" | "overlay" | "none" = "persistent";

      if (hamburgerSelectors.some((sel) => document.querySelector(sel))) {
        type = "hamburger";
      } else if (style.position === "fixed" || style.position === "absolute") {
        type = "overlay";
      }

      return {
        isPresent: true,
        isOpen,
        type,
      };
    })) as SidebarState;
  }

  /**
   * Ensure sidebar is in consistent state for testing - cached for performance
   */
  async function ensureConsistentSidebarState(page: Page): Promise<void> {
    // Use cached state if available to avoid repeated expensive DOM queries
    if (!cachedSidebarState) {
      cachedSidebarState = await detectSidebarState(page);
    }

    if (!cachedSidebarState.isPresent) return;

    // For hamburger menus, ensure they're closed to prevent occlusion
    if (cachedSidebarState.type === "hamburger" && cachedSidebarState.isOpen) {
      const hamburgerButton = await page.$(
        '.hamburger, .menu-toggle, .nav-toggle, [aria-label*="menu"]'
      );
      if (hamburgerButton) {
        await hamburgerButton.click();
        await new Promise((resolve) => setTimeout(resolve, 250)); // Reduced wait time
        cachedSidebarState.isOpen = false; // Update cache
      }
    }

    // For overlay sidebars, try to close them
    if (cachedSidebarState.type === "overlay" && cachedSidebarState.isOpen) {
      // Try clicking outside the sidebar
      await page.click("body", { offset: { x: 10, y: 10 } });
      await new Promise((resolve) => setTimeout(resolve, 150)); // Reduced wait time
      cachedSidebarState.isOpen = false; // Update cache
    }
  }

  /**
   * Multi-strategy robust click implementation with fallbacks
   */
  async function robustClick(
    page: Page,
    selector: string
  ): Promise<{ success: boolean; method: string; error?: string }> {
    // Strategy 1: Standard Puppeteer click with element validation
    try {
      const elementState = await validateElementState(page, selector);

      if (!elementState.exists) {
        return {
          success: false,
          method: "validation",
          error: "Element does not exist",
        };
      }

      if (!elementState.visible) {
        return {
          success: false,
          method: "validation",
          error: "Element is not visible",
        };
      }

      if (!elementState.clickable) {
        return {
          success: false,
          method: "validation",
          error: "Element is not clickable (disabled or no pointer events)",
        };
      }

      if (elementState.isOccluded) {
        return {
          success: false,
          method: "validation",
          error: "Element is occluded by another element",
        };
      }

      // Quick stability check - reduced timeout for speed
      const isStable = await waitForElementStability(page, selector, 1500);
      if (!isStable) {
        // Try immediate click if stability fails (element might still be clickable)
        try {
          await page.click(selector, { delay: 25 });
          return { success: true, method: "standard_immediate" };
        } catch {
          return {
            success: false,
            method: "stability",
            error: "Element is not stable (animations/layout shifts)",
          };
        }
      }

      // Scroll element into view with instant behavior for speed
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: "instant",
          });
        }
      }, selector);

      await new Promise((resolve) => setTimeout(resolve, 100)); // Reduced scroll wait

      // Standard click with reduced delay
      await page.click(selector, { delay: 25 });
      return { success: true, method: "standard" };
    } catch (error) {
      // Strategy 2: JavaScript click fallback
      try {
        const clicked = await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLElement;
          if (!el) return false;
          el.click();
          return true;
        }, selector);

        if (clicked) {
          return { success: true, method: "javascript" };
        }
      } catch (jsError) {
        // Strategy 3: Dispatch click event fallback
        try {
          const dispatched = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;

            const clickEvent = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            });

            el.dispatchEvent(clickEvent);
            return true;
          }, selector);

          if (dispatched) {
            return { success: true, method: "dispatch" };
          }
        } catch (dispatchError) {
          return {
            success: false,
            method: "all_failed",
            error: `All click strategies failed. Last error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      }
    }

    return {
      success: false,
      method: "unknown",
      error: "Unexpected click failure",
    };
  }

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

  // Refined isAuthPage for stricter pathname matching
  async function isAuthPage(page: Page): Promise<boolean> {
    const urlObj = new URL(page.url());
    const pathname = urlObj.pathname;
    // Only match exact auth routes
    if (/\b(auth|login|signin|register|signup|account)\b/i.test(pathname)) {
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
    visited: Set<string>,
    checkedElements: Set<string>
  ) {
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
          // Fill email and password
          await fillAuthFields(page, "Relyqatest@gmail.com", "RelyQA@123");
          const urlBeforeSignIn = page.url();
          await el.click();
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
            await analyzePage(
              page,
              urlAfterSignIn,
              visited,
              results,
              checkedElements
            );
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
            await el.click();
            await new Promise((res) => setTimeout(res, 1500));
            // Check for UI change (e.g., new form fields)
            const hasUsername = await page.evaluate(() => {
              return !!document.querySelector(
                'input[name*="user" i], input[placeholder*="user" i], input[aria-label*="user" i]'
              );
            });
            if (!hasUsername) {
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
                  await subEl.click();
                  await new Promise((res) => setTimeout(res, 1500));
                  break;
                }
              }
            }
            // After sign up, try to sign in again
            await handleAuthPage(
              page,
              results,
              originalUrl,
              visited,
              checkedElements
            );
            return;
          }
        }
        if (foundSignUp) break;
      }
    }
  }

  // Helper to fill sign in fields
  async function fillAuthFields(page: Page, email: string, password: string) {
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
          filledPassword = true;
        }
      } catch (error) {
        // Ignore errors in filling fields
      }
    }

    if (!filledEmail) {
      // Ignore no matching email field found
    }
    if (!filledPassword) {
      // Ignore no matching password field found
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
        break;
      }
    }
    if (!filledUsername) {
      // Ignore no username field found
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
        break;
      }
    }
    if (!filledConfirm) {
      // Ignore no confirm password field found
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

  // Helper to find associated search button for an input
  async function findSearchButton(
    page: Page,
    searchInput: string
  ): Promise<string | null> {
    return await page.evaluate((inputSelector) => {
      const input = document.querySelector(inputSelector);
      if (!input) return null;

      // First check the immediate flex container
      const flexContainer = input.closest('.flex, [class*="flex"]');
      if (flexContainer) {
        // Look for button with search text or icon within the same flex container
        const buttons = Array.from(flexContainer.querySelectorAll("button"));
        const searchButton = buttons.find((btn) => {
          // Check for text content "Search"
          const hasSearchText = btn.textContent
            ?.toLowerCase()
            .includes("search");
          // Check for search icon (SVG)
          const hasSearchIcon = btn.querySelector(
            'svg[class*="search"], svg[class*="lucide-search"]'
          );
          return hasSearchText || hasSearchIcon;
        });

        if (searchButton) {
          if (!searchButton.hasAttribute("data-analyzer-id")) {
            searchButton.setAttribute(
              "data-analyzer-id",
              `search-submit-${Math.random()}`
            );
          }
          return `[data-analyzer-id='${searchButton.getAttribute(
            "data-analyzer-id"
          )}']`;
        }
      }

      // Check for button/submit within same form (fallback)
      if (input.closest("form")) {
        const formButton = input
          .closest("form")
          ?.querySelector(
            'button[type="submit"], input[type="submit"], [role="button"]'
          );
        if (formButton) {
          if (!formButton.hasAttribute("data-analyzer-id")) {
            formButton.setAttribute(
              "data-analyzer-id",
              `search-submit-${Math.random()}`
            );
          }
          return `[data-analyzer-id='${formButton.getAttribute(
            "data-analyzer-id"
          )}']`;
        }
      }

      // Look for adjacent search button with more specific selectors
      const searchButtonSelectors = [
        // Button with search text
        'button:not([aria-hidden="true"]):has(svg):contains("Search")',
        // Button with search icon
        'button:has(svg[class*="search"])',
        'button:has(svg[class*="lucide-search"])',
        // Standard search buttons
        'button[aria-label*="search" i]',
        '[role="button"][aria-label*="search" i]',
        'button[type="submit"]',
        '[role="button"]',
      ];

      // Search in nearby elements (siblings and parent's children)
      const searchArea = input.parentElement;
      if (!searchArea) return null;

      for (const selector of searchButtonSelectors) {
        const buttons = Array.from(searchArea.querySelectorAll(selector));
        const nearbyButton = buttons.find((btn) => {
          const rect = btn.getBoundingClientRect();
          const inputRect = input.getBoundingClientRect();
          // Check if button is within reasonable distance (e.g., 100px) of input
          const isNearby =
            Math.abs(rect.left - inputRect.right) < 100 &&
            Math.abs(rect.top - inputRect.top) < 50;
          // Check for search text or icon
          const hasSearchText = btn.textContent
            ?.toLowerCase()
            .includes("search");
          const hasSearchIcon = btn.querySelector(
            'svg[class*="search"], svg[class*="lucide-search"]'
          );

          return isNearby && (hasSearchText || hasSearchIcon);
        });

        if (nearbyButton) {
          if (!nearbyButton.hasAttribute("data-analyzer-id")) {
            nearbyButton.setAttribute(
              "data-analyzer-id",
              `search-submit-${Math.random()}`
            );
          }
          return `[data-analyzer-id='${nearbyButton.getAttribute(
            "data-analyzer-id"
          )}']`;
        }
      }

      return null;
    }, searchInput);
  }

  /**
   * Analyze dropdown elements and check for UI changes after interaction
   */
  async function analyzeDropdowns(
    page: Page,
    currentUrl: string,
    results: ButtonClickResult[]
  ) {
    // Find all dropdown elements
    const dropdownSelectors = await page.evaluate(() => {
      const selectors: { selector: string; type: string }[] = [];
      let idx = 0;

      // Common dropdown patterns
      const dropdownPatterns = [
        "select",
        '[role="combobox"]',
        '[role="listbox"]',
        '[aria-haspopup="listbox"]',
        '[aria-haspopup="menu"]',
        '[data-state="closed"][data-state="open"]',
        ".dropdown",
        '[class*="dropdown"]',
        '[class*="select"]',
      ];

      dropdownPatterns.forEach((pattern) => {
        document.querySelectorAll(pattern).forEach((el) => {
          if (el instanceof HTMLElement) {
            const id = `dropdown-${idx++}`;
            el.setAttribute("data-dropdown-analyzer-id", id);
            selectors.push({
              selector: `[data-dropdown-analyzer-id='${id}']`,
              type: el.tagName.toLowerCase() === "select" ? "native" : "custom",
            });
          }
        });
      });

      return selectors;
    });

    for (const { selector, type } of dropdownSelectors) {
      try {
        const elementInfo = await page.evaluate(
          (sel, elType) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            return {
              label:
                el.getAttribute("aria-label") ||
                el.getAttribute("name") ||
                (el as HTMLElement).textContent?.trim() ||
                "Dropdown",
              hasOptions:
                elType === "native"
                  ? (el as HTMLSelectElement).options.length > 0
                  : !!el.querySelector('[role="option"]'),
            };
          },
          selector,
          type
        );

        if (!elementInfo || !elementInfo.hasOptions) continue;

        // Capture state before interaction
        const stateBefore = await captureDetailedState(page);

        // Click the dropdown
        const clickResult = await robustClick(page, selector);
        if (!clickResult.success) continue;

        await new Promise((res) => setTimeout(res, 500)); // Wait for dropdown to open

        // For native select, change the value
        if (type === "native") {
          await page.evaluate((sel) => {
            const select = document.querySelector(sel) as HTMLSelectElement;
            if (select && select.options.length > 1) {
              select.selectedIndex = 1;
              select.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }, selector);
        } else {
          // For custom dropdowns, try to click the first option
          const optionClicked = await page.evaluate((sel) => {
            const dropdown = document.querySelector(sel);
            if (!dropdown) return false;

            const option =
              dropdown.querySelector(
                '[role="option"]:not([aria-selected="true"])'
              ) ||
              dropdown.querySelector("li:not(.selected)") ||
              dropdown.querySelector(".dropdown-item:not(.active)");

            if (option) {
              (option as HTMLElement).click();
              return true;
            }
            return false;
          }, selector);

          if (!optionClicked) {
            // Try clicking the dropdown again to close it
            await robustClick(page, selector);
          }
        }

        await new Promise((res) => setTimeout(res, 500));

        // Check if there's a filter/search button nearby
        const filterButton = await findNearbyFilterButton(page, selector);

        if (filterButton) {
          // Click the filter button
          await robustClick(page, filterButton);
          await new Promise((res) => setTimeout(res, 1000));
        }

        // Capture state after interaction
        const stateAfter = await captureDetailedState(page);

        // Check for UI changes
        const uiChanged = hasSignificantUIChange(stateBefore, stateAfter);

        if (!uiChanged && !filterButton) {
          console.log(
            `[BUG][NoDropdownEffect] Dropdown '${elementInfo.label}' selection did not cause any UI change.`
          );
          results.push({
            selector,
            textContent: elementInfo.label,
            navigated: false,
            urlBefore: currentUrl,
            urlAfter: page.url(),
            contentChanged: false,
            bugType: "NoDropdownEffect",
            description: `Dropdown '${elementInfo.label}' selection did not cause any UI change.`,
            elementType: "custom",
            isVisible: true,
            wasClicked: true,
          });
        }
      } catch (error: any) {
        console.log(
          `[BUG][DropdownError] ${error.message} | Selector: ${selector}`
        );
      }
    }
  }

  /**
   * Analyze checkbox elements and check for UI changes after interaction
   */
  async function analyzeCheckboxes(
    page: Page,
    currentUrl: string,
    results: ButtonClickResult[]
  ) {
    // Find all checkbox elements
    const checkboxSelectors = await page.evaluate(() => {
      const selectors: string[] = [];
      let idx = 0;

      // Find checkboxes
      const checkboxPatterns = [
        'input[type="checkbox"]',
        '[role="checkbox"]',
        "[aria-checked]",
      ];

      checkboxPatterns.forEach((pattern) => {
        document.querySelectorAll(pattern).forEach((el) => {
          if (el instanceof HTMLElement) {
            // Skip if hidden or disabled
            const style = window.getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              el.hasAttribute("disabled") ||
              el.getAttribute("aria-disabled") === "true"
            ) {
              return;
            }

            const id = `checkbox-${idx++}`;
            el.setAttribute("data-checkbox-analyzer-id", id);
            selectors.push(`[data-checkbox-analyzer-id='${id}']`);
          }
        });
      });

      return selectors;
    });

    // Group checkboxes by their form or container
    const checkboxGroups = await page.evaluate((selectors) => {
      const groups: { [key: string]: string[] } = {};

      selectors.forEach((sel) => {
        const checkbox = document.querySelector(sel);
        if (!checkbox) return;

        // Find the form or container
        const form = checkbox.closest("form");
        const container = checkbox.closest(
          '[role="group"], .filter-group, .checkbox-group, fieldset'
        );

        const groupKey = form
          ? `form-${Array.from(document.forms).indexOf(
              form as HTMLFormElement
            )}`
          : container
          ? `container-${Array.from(
              document.querySelectorAll(
                '[role="group"], .filter-group, .checkbox-group, fieldset'
              )
            ).indexOf(container)}`
          : "no-group";

        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(sel);
      });

      return groups;
    }, checkboxSelectors);

    // Analyze each group
    for (const [groupKey, groupSelectors] of Object.entries(checkboxGroups)) {
      if (groupSelectors.length === 0) continue;

      try {
        // Capture state before interaction
        const stateBefore = await captureDetailedState(page);

        // Click a few checkboxes in the group
        const checkboxesToClick = groupSelectors.slice(
          0,
          Math.min(3, groupSelectors.length)
        );

        for (const checkboxSelector of checkboxesToClick) {
          const clickResult = await robustClick(page, checkboxSelector);
          if (clickResult.success) {
            await new Promise((res) => setTimeout(res, 200));
          }
        }

        // Check if there's a filter/apply button for this group
        const filterButton = await findGroupFilterButton(
          page,
          groupSelectors[0]
        );

        let stateAfter;

        if (filterButton) {
          // Click the filter button
          await robustClick(page, filterButton);
          await new Promise((res) => setTimeout(res, 1000));
          stateAfter = await captureDetailedState(page);
        } else {
          // No filter button, check immediate changes
          await new Promise((res) => setTimeout(res, 500));
          stateAfter = await captureDetailedState(page);
        }

        // Check for UI changes
        const uiChanged = hasSignificantUIChange(stateBefore, stateAfter);

        if (!uiChanged) {
          const groupLabel = await page.evaluate((sel) => {
            const checkbox = document.querySelector(sel);
            const form = checkbox?.closest("form");
            const fieldset = checkbox?.closest("fieldset");
            const legend = fieldset?.querySelector("legend");

            return (
              legend?.textContent?.trim() ||
              form?.getAttribute("aria-label") ||
              "Checkbox group"
            );
          }, groupSelectors[0]);

          console.log(
            `[BUG][NoCheckboxEffect] Checkbox group '${groupLabel}' selection did not cause any UI change${
              filterButton ? " after clicking filter button" : ""
            }.`
          );

          results.push({
            selector: groupSelectors.join(", "),
            textContent: groupLabel,
            navigated: false,
            urlBefore: currentUrl,
            urlAfter: page.url(),
            contentChanged: false,
            bugType: "NoCheckboxEffect",
            description: `Checkbox group '${groupLabel}' selection did not cause any UI change${
              filterButton ? " after clicking filter button" : ""
            }.`,
            elementType: "custom",
            isVisible: true,
            wasClicked: true,
          });
        }

        // Uncheck the checkboxes to reset state
        for (const checkboxSelector of checkboxesToClick) {
          await robustClick(page, checkboxSelector);
          await new Promise((res) => setTimeout(res, 100));
        }
      } catch (error: any) {
        console.log(
          `[BUG][CheckboxError] ${error.message} | Group: ${groupKey}`
        );
      }
    }
  }

  /**
   * Capture detailed page state for comparison
   */
  async function captureDetailedState(page: Page) {
    return await page.evaluate(() => ({
      htmlLength: document.body.outerHTML.length,
      textContent: document.body.innerText,
      visibleElements: Array.from(document.querySelectorAll("*")).filter(
        (el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        }
      ).length,
      // Capture dynamic content areas
      dynamicContent: Array.from(
        document.querySelectorAll("[data-dynamic], .results, .content, main")
      ).map((el) => ({
        selector:
          el.tagName +
          (el.id ? `#${el.id}` : "") +
          (el.className ? `.${el.className.split(" ")[0]}` : ""),
        content: (el as HTMLElement).innerText?.substring(0, 100),
      })),
      // Capture aria-live regions
      liveRegions: Array.from(document.querySelectorAll("[aria-live]")).map(
        (el) => (el as HTMLElement).innerText
      ),
      // Capture expanded states
      expandedStates: Array.from(
        document.querySelectorAll("[aria-expanded], [data-state]")
      ).map((el) => ({
        id: el.id || el.className,
        expanded:
          el.getAttribute("aria-expanded") || el.getAttribute("data-state"),
      })),
    }));
  }

  /**
   * Check if there's a significant UI change between two states
   */
  function hasSignificantUIChange(stateBefore: any, stateAfter: any): boolean {
    // Check for text content changes (ignoring minor whitespace differences)
    const textChanged =
      Math.abs(stateBefore.textContent.length - stateAfter.textContent.length) >
      10;

    // Check for HTML structure changes
    const htmlChanged =
      Math.abs(stateBefore.htmlLength - stateAfter.htmlLength) > 50;

    // Check for visible element count changes
    const elementCountChanged =
      Math.abs(stateBefore.visibleElements - stateAfter.visibleElements) > 2;

    // Check for dynamic content changes
    const dynamicContentChanged =
      JSON.stringify(stateBefore.dynamicContent) !==
      JSON.stringify(stateAfter.dynamicContent);

    // Check for live region updates
    const liveRegionChanged =
      JSON.stringify(stateBefore.liveRegions) !==
      JSON.stringify(stateAfter.liveRegions);

    // Check for expanded state changes
    const expandedStateChanged =
      JSON.stringify(stateBefore.expandedStates) !==
      JSON.stringify(stateAfter.expandedStates);

    return (
      textChanged ||
      htmlChanged ||
      elementCountChanged ||
      dynamicContentChanged ||
      liveRegionChanged ||
      expandedStateChanged
    );
  }

  /**
   * Find a filter/search button near a dropdown or checkbox group
   */
  async function findNearbyFilterButton(
    page: Page,
    elementSelector: string
  ): Promise<string | null> {
    return await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      // Look for filter/search/apply buttons
      const buttonPatterns = [
        "filter",
        "search",
        "apply",
        "update",
        "submit",
        "go",
        "refresh",
      ];

      // Search in the parent form first
      const form = element.closest("form");
      if (form) {
        const buttons = Array.from(
          form.querySelectorAll('button, input[type="submit"], [role="button"]')
        );
        for (const btn of buttons) {
          const text = (btn as HTMLElement).textContent?.toLowerCase() || "";
          const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";

          if (
            buttonPatterns.some(
              (pattern) => text.includes(pattern) || ariaLabel.includes(pattern)
            )
          ) {
            if (!btn.hasAttribute("data-analyzer-id")) {
              btn.setAttribute(
                "data-analyzer-id",
                `filter-btn-${Math.random()}`
              );
            }
            return `[data-analyzer-id='${btn.getAttribute(
              "data-analyzer-id"
            )}']`;
          }
        }
      }

      // Search in nearby containers
      const container = element.closest(
        '.filter-container, .search-container, [role="search"], section'
      );
      if (container) {
        const buttons = Array.from(
          container.querySelectorAll(
            'button, input[type="submit"], [role="button"]'
          )
        );
        for (const btn of buttons) {
          const text = (btn as HTMLElement).textContent?.toLowerCase() || "";
          const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";

          if (
            buttonPatterns.some(
              (pattern) => text.includes(pattern) || ariaLabel.includes(pattern)
            )
          ) {
            if (!btn.hasAttribute("data-analyzer-id")) {
              btn.setAttribute(
                "data-analyzer-id",
                `filter-btn-${Math.random()}`
              );
            }
            return `[data-analyzer-id='${btn.getAttribute(
              "data-analyzer-id"
            )}']`;
          }
        }
      }

      return null;
    }, elementSelector);
  }

  /**
   * Find a filter button for a checkbox group
   */
  async function findGroupFilterButton(
    page: Page,
    checkboxSelector: string
  ): Promise<string | null> {
    return await page.evaluate((selector) => {
      const checkbox = document.querySelector(selector);
      if (!checkbox) return null;

      // Find the form or fieldset containing the checkbox
      const form = checkbox.closest("form");
      const fieldset = checkbox.closest("fieldset");
      const container =
        form || fieldset || checkbox.closest(".filter-group, .checkbox-group");

      if (!container) return null;

      // Look for submit/filter buttons within the container
      const buttons = Array.from(
        container.querySelectorAll(
          'button, input[type="submit"], [role="button"]'
        )
      );

      for (const btn of buttons) {
        const text = (btn as HTMLElement).textContent?.toLowerCase() || "";
        const value = (btn as HTMLInputElement).value?.toLowerCase() || "";
        const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";

        // Check for filter-related text
        const filterKeywords = [
          "apply",
          "filter",
          "search",
          "update",
          "submit",
          "go",
        ];
        if (
          filterKeywords.some(
            (keyword) =>
              text.includes(keyword) ||
              value.includes(keyword) ||
              ariaLabel.includes(keyword)
          )
        ) {
          if (!btn.hasAttribute("data-analyzer-id")) {
            btn.setAttribute(
              "data-analyzer-id",
              `group-filter-btn-${Math.random()}`
            );
          }
          return `[data-analyzer-id='${btn.getAttribute("data-analyzer-id")}']`;
        }
      }

      return null;
    }, checkboxSelector);
  }

  // Update the analyzeSearchFields function
  async function analyzeSearchFields(
    page: Page,
    currentUrl: string,
    results: ButtonClickResult[]
  ) {
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

        // Look for associated search button
        const searchButtonSelector = await findSearchButton(page, selector);

        // Try clicking search button if found, otherwise use Enter key
        if (searchButtonSelector) {
          await waitForElementStability(page, searchButtonSelector, 1000);
          const clickResult = await robustClick(page, searchButtonSelector);
          wasSearched = clickResult.success;

          if (!clickResult.success) {
            console.log(
              `[BUG][SearchError] Failed to click search button: ${clickResult.error}`
            );
            error = `Failed to click search button: ${clickResult.error}`;
          }
        } else {
          // No search button found, use Enter key as fallback
          await waitForElementStability(page, selector, 1000);
          await page.keyboard.press("Enter");
          wasSearched = true;
        }

        // Wait for possible navigation or UI change
        const [response] = await Promise.all([
          page.waitForNavigation({ timeout: 1500 }).catch(() => null),
          new Promise((res) => setTimeout(res, 400)),
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

        if (!navigated && !contentChanged) {
          bugType = "NoSearchEffect";
          description = `Search field '${selector}' did not cause navigation or UI change when searching for 'Hello'${
            searchButtonSelector ? " (with search button)" : " (with Enter key)"
          }.`;
          console.log(`[BUG][${bugType}] ${description}`);
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
        console.log(`[BUG][SearchError] ${error} | Selector: ${selector}`);
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
    results: ButtonClickResult[],
    checkedElements: Set<string>
  ): Promise<void> {
    const normalizedUrl = normalizeUrl(currentUrl);
    if (visited.has(normalizedUrl)) {
      return;
    }
    visited.add(normalizedUrl);

    await ensureConsistentSidebarState(page);

    await injectAnalyzerAttributes(page);

    // Analyze form elements first
    await analyzeSearchFields(page, currentUrl, results);
    await analyzeDropdowns(page, currentUrl, results);
    await analyzeCheckboxes(page, currentUrl, results);

    if (await isAuthPage(page)) {
      await handleAuthPage(page, results, currentUrl, visited, checkedElements);
      return;
    }

    const clickableElements = await getClickableSelectors(page);
    const footerTestedSet = new Set<string>();
    for (let i = 0; i < clickableElements.length; i++) {
      const { selector, elementType } = clickableElements[i];
      const elementKey = `${normalizedUrl}|${selector}`;
      if (checkedElements.has(elementKey)) {
        continue;
      }
      checkedElements.add(elementKey);
      let urlBefore = page.url();
      let navigated = false;
      let urlAfter = urlBefore;
      let error: string | undefined = undefined;
      let wasClicked = false;
      let textContent = "";
      let elementLabel = "";
      let href: string | undefined = undefined;
      let bugType: string | undefined = undefined;
      let description: string | undefined = undefined;
      try {
        // Try to get visible text
        textContent = await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          return el ? el.textContent?.trim() || "" : "";
        }, selector);
        // Call the callback with the current button info
        if (onButtonScanned) {
          onButtonScanned({ selector, textContent, elementType });
        }
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
        // DEBUG: Log which button is being pressed and the number of buttons clicked so far
        console.log(
          `[DEBUG] Pressing: ${elementLabel} | Selector: ${selector} | Button #${
            i + 1
          } of ${clickableElements.length}`
        );
        // For <a> elements, get href
        if (elementType === "link") {
          href = await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return el ? el.getAttribute("href") || undefined : undefined;
          }, selector);
          // --- ICON-ONLY SOCIAL/MAIL LINK CHECK ---
          const hasIcon = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return !!(el && el.querySelector("svg"));
          }, selector);
          const hasText = textContent && textContent.trim().length > 0;
          if (hasIcon && !hasText && href) {
            // Determine expected domain/protocol
            let expected: string | null = null;
            const lowerSel = selector.toLowerCase();
            if (lowerSel.includes("linkedin")) expected = "linkedin.com";
            else if (lowerSel.includes("github")) expected = "github.com";
            else if (lowerSel.includes("twitter")) expected = "twitter.com";
            else if (lowerSel.includes("mail")) expected = "mailto:";
            // Fallback: check href itself
            if (!expected) {
              if (href.includes("linkedin.com")) expected = "linkedin.com";
              else if (href.includes("github.com")) expected = "github.com";
              else if (href.includes("twitter.com")) expected = "twitter.com";
              else if (href.startsWith("mailto:")) expected = "mailto:";
            }
            if (expected) {
              // Open in new tab and check redirection
              if (!browser) continue;
              const [newPage] = await Promise.all([
                (browser as import("puppeteer").Browser)
                  .waitForTarget((target) => target.url() !== page.url())
                  .then((target) => target.page()),
                page.evaluate((sel) => {
                  const el = document.querySelector(sel);
                  if (el) {
                    const evt = new MouseEvent("click", {
                      bubbles: true,
                      cancelable: true,
                      view: window,
                      ctrlKey: true,
                    });
                    el.dispatchEvent(evt);
                  }
                }, selector),
              ]);
              if (!newPage) continue;
              await (newPage as import("puppeteer").Page).bringToFront();
              await (newPage as import("puppeteer").Page)
                .waitForNavigation({
                  waitUntil: "domcontentloaded",
                  timeout: 5000,
                })
                .catch(() => null);
              const finalUrl = (newPage as import("puppeteer").Page).url();
              let failed = false;
              if (expected.startsWith("mailto:")) {
                if (!finalUrl.startsWith("mailto:")) failed = true;
              } else {
                if (!finalUrl.includes(expected)) failed = true;
              }
              if (failed) {
                console.log(
                  `[BUG][IconLinkRedirectionError] Icon link did not redirect to expected ${expected} page. Got: ${finalUrl} | Selector: ${elementLabel} | URL: ${urlAfter}`
                );
                results.push({
                  selector,
                  textContent: "",
                  navigated: true,
                  urlBefore: page.url(),
                  urlAfter: finalUrl,
                  contentChanged: true,
                  bugType: "IconLinkRedirectionError",
                  description: `Icon link did not redirect to expected ${expected} page. Got: ${finalUrl}`,
                  elementType,
                  isVisible: true,
                  wasClicked: true,
                });
              }
              await (newPage as import("puppeteer").Page).close();
              continue; // Don't double-process this element
            }
          }
          // --- END ICON-ONLY SOCIAL/MAIL LINK CHECK ---
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
            continue;
          }
          footerTestedSet.add(footerKey);
        }
        // Before click, capture a more detailed state of the page (expert-level)
        const stateBefore = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll(
              "[aria-expanded], [data-state], .expanded, .collapsed, .open, .closed"
            )
          ).map((el) => ({
            expanded: el.getAttribute("aria-expanded"),
            state: el.getAttribute("data-state"),
            classList: Array.from(el.classList).join(" "),
          })),
          textContent: document.body.innerText,
        }));
        // Use robust click implementation with fallbacks
        const clickResult = await robustClick(page, selector);
        wasClicked = clickResult.success;
        if (!clickResult.success) {
          error = clickResult.error;
          // Only report as a bug if the element should be clickable but our robust click failed
          if (clickResult.method === "validation") {
            // This is not a bug - element genuinely not clickable
            continue;
          }
        }
        // Check for navigation after successful click - reduced timeouts
        const navigationPromise = page
          .waitForNavigation({ timeout: 1500 })
          .catch(() => null);
        await new Promise((resolve) => setTimeout(resolve, 200)); // Reduced navigation wait
        const response = await navigationPromise;
        urlAfter = page.url();
        navigated = urlAfter !== urlBefore;
        if (navigated) {
          // Check for 404 error after navigation
          let is404 = false;
          if (response) {
            if (response.status() === 404) {
              is404 = true;
            }
          } else {
            // Fallback: check page content
            const title = await page.title();
            const h1 = await page
              .$eval("h1", (el) => el.textContent)
              .catch(() => "");
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (
              title.toLowerCase().includes("404") ||
              (h1 && h1.toLowerCase().includes("404")) ||
              bodyText.toLowerCase().includes("not found")
            ) {
              is404 = true;
            }
          }
          if (is404) {
            console.log(
              `[BUG][404Error] Navigated to a page with a 404 or not found error. | Selector: ${elementLabel} | URL: ${urlAfter}`
            );
            results.push({
              selector: elementLabel,
              textContent,
              navigated,
              urlBefore,
              urlAfter,
              contentChanged: true,
              bugType: "404Error",
              description: "Navigated to a page with a 404 or not found error.",
              elementType,
              isVisible: true,
              wasClicked,
            });
            // Go back to previous page - optimized timeout
            await page
              .goBack({ waitUntil: "domcontentloaded", timeout: 5000 })
              .catch(() => null);
            await injectAnalyzerAttributes(page);
            continue;
          }
        }
        // After click, quick check for UI changes
        await new Promise((res) => setTimeout(res, 300));
        const stateAfter = await page.evaluate(() => ({
          htmlLength: document.body.outerHTML.length,
          expanded: Array.from(
            document.querySelectorAll(
              "[aria-expanded], [data-state], .expanded, .collapsed, .open, .closed"
            )
          ).map((el) => ({
            expanded: el.getAttribute("aria-expanded"),
            state: el.getAttribute("data-state"),
            classList: Array.from(el.classList).join(" "),
          })),
          textContent: document.body.innerText,
        }));

        const htmlDiff = Math.abs(
          stateBefore.htmlLength - stateAfter.htmlLength
        );
        let contentChanged = false;

        // Enhanced dropdown state detection
        const dropdownStateChanged =
          JSON.stringify(stateBefore.expanded) !==
          JSON.stringify(stateAfter.expanded);

        if (detectionLevel === "expert") {
          contentChanged =
            htmlDiff > 20 ||
            stateBefore.textContent !== stateAfter.textContent ||
            dropdownStateChanged;
        } else {
          contentChanged =
            stateBefore.htmlLength !== stateAfter.htmlLength ||
            dropdownStateChanged;
        }
        if (!navigated && !error && !contentChanged) {
          const isLinkToCurrentPage =
            elementType === "link" && href
              ? normalizeUrl(href, urlBefore) === normalizedUrl
              : false;
          if (!navigated && !error && !contentChanged && !isLinkToCurrentPage) {
            bugType = "NoNavigation";
            description = `${
              elementType === "link" ? "Link" : "Button"
            } '${elementLabel}' did not navigate or change content as expected. Click method: ${
              clickResult.method
            }`;
          }
        }
        // Bug detection for navigation-expected elements
        bugType = error ? "ClickError" : undefined;
        description = error;
        if (!navigated && !error && !contentChanged) {
          const isLinkToCurrentPage =
            elementType === "link" && href
              ? normalizeUrl(href, urlBefore) === normalizedUrl
              : false;

          if (!navigated && !error && !contentChanged && !isLinkToCurrentPage) {
            bugType = "NoNavigation";
            description = `${
              elementType === "link" ? "Link" : "Button"
            } '${elementLabel}' did not navigate or change content as expected. Click method: ${
              clickResult.method
            }`;
          }
        }

        // Enhanced error reporting with click strategy details
        if (error && clickResult.method !== "validation") {
          bugType = "ClickError";
          description = `${elementType} '${elementLabel}' failed to click using method: ${clickResult.method}. Error: ${error}`;
        }
        if (bugType) {
          console.log(
            `[BUG][${bugType}] ${
              description || ""
            } | Selector: ${selector} | URL: ${urlAfter}`
          );
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
        // If navigation and new URL not visited, recurse
        if (navigated && !visited.has(normalizeUrl(urlAfter))) {
          await analyzePage(page, urlAfter, visited, results, checkedElements);
          // After recursion, go back to previous page - optimized timeout
          await page
            .goBack({ waitUntil: "domcontentloaded", timeout: 5000 })
            .catch(() => null);
          await injectAnalyzerAttributes(page); // Re-inject after going back
        } else if (navigated && visited.has(normalizeUrl(urlAfter))) {
          // If navigated to already visited page, go back immediately - optimized timeout
          await page
            .goBack({ waitUntil: "domcontentloaded", timeout: 5000 })
            .catch(() => null);
          await injectAnalyzerAttributes(page);
        }
      } catch (e: any) {
        error = e.message;
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

  async function safeClick(page: Page, selector: string): Promise<boolean> {
    const el = await page.$(selector);
    if (!el) {
      return false;
    }
    try {
      await el.evaluate((e) =>
        e.scrollIntoView({ block: "center", inline: "center" })
      );
      await page.waitForSelector(selector, { visible: true, timeout: 2000 });
      await el.click();
      return true;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return false;
    }
  }

  /**
   * Check if page is still valid and can be used
   */
  async function isPageHealthy(page: Page): Promise<boolean> {
    try {
      if (page.isClosed()) {
        return false;
      }
      // Try a simple evaluation to check if page is responsive
      await page.evaluate(() => document.readyState);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Safely perform page operations with health checks
   */
  async function safePageOperation<T>(
    page: Page,
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!(await isPageHealthy(page))) {
      throw new Error(`Page is not healthy before ${operationName}`);
    }

    try {
      const result = await operation();

      // Check if page is still healthy after operation
      if (!(await isPageHealthy(page))) {
        console.warn(`⚠️ Page became unhealthy after ${operationName}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error during ${operationName}:`, error);
      throw error;
    }
  }

  while (attempt < maxRetries) {
    try {
      // Docker-compatible Puppeteer configuration with enhanced stability
      const puppeteerConfig: any = {
        headless: true,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-features=NetworkService",
          "--disable-extensions",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-software-rasterizer",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-sync",
          "--disable-translate",
          "--hide-scrollbars",
          "--metrics-recording-only",
          "--mute-audio",
          "--no-default-browser-check",
          "--no-pings",
          "--password-store=basic",
          "--use-mock-keychain",
          "--disable-component-extensions-with-background-pages",
          "--disable-extensions-except",
          "--disable-plugins-discovery",
          "--disable-preconnect",
          "--disable-print-preview",
          "--disable-component-update",
          "--disable-domain-reliability",
          "--disable-client-side-phishing-detection",
          "--disable-hang-monitor",
          "--disable-popup-blocking",
          "--disable-prompt-on-repost",
          "--disable-sync",
          "--disable-web-resources",
          "--disable-permissions-api",
          "--disable-notifications",
          "--disable-desktop-notifications",
          "--disable-file-system",
          "--disable-web-security",
          "--allow-running-insecure-content",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--memory-pressure-off",
          "--max_old_space_size=4096",
        ],
        // Enhanced timeout settings for Docker
        timeout: 60000,
        protocolTimeout: 60000,
        // Do NOT set userDataDir to ensure a fresh profile is used
      };

      // Use Docker Chrome executable if available
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      } else if (process.env.CHROME_BIN) {
        puppeteerConfig.executablePath = process.env.CHROME_BIN;
      }

      console.log("🚀 Launching Chrome with config:", {
        executablePath: puppeteerConfig.executablePath || "default",
        argsCount: puppeteerConfig.args.length,
        headless: puppeteerConfig.headless,
      });

      browser = await puppeteer.launch(puppeteerConfig);
      console.log("✅ Chrome launched successfully");

      console.log("📄 Creating new page...");
      let page: Page;

      try {
        console.log("🔄 Creating new page...");
        page = await browser.newPage();
        console.log("✅ Page created successfully");

        // Add debugging for page events
        page.on("error", (err) => {
          console.error("🚨 Page error:", err);
        });

        page.on("pageerror", (err) => {
          console.error("🚨 Page error event:", err);
        });

        page.on("requestfailed", (req) => {
          console.warn(
            "⚠️ Request failed:",
            req.url(),
            req.failure()?.errorText
          );
        });
      } catch (pageError) {
        console.error("❌ Failed to create page:", pageError);
        throw new Error(`Failed to create page: ${pageError}`);
      }

      try {
        // Set page timeouts to match our configuration
        console.log("🔄 Setting page timeouts...");
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        console.log("⏱️ Page timeouts set to 60 seconds");

        // Test page responsiveness with a simple operation
        console.log("🔄 Testing page responsiveness...");
        await page.evaluate(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(true), 100);
          });
        });
        console.log("✅ Page is responsive");
      } catch (timeoutError: any) {
        console.error(
          "❌ Failed to set page timeouts or test responsiveness:",
          timeoutError
        );

        // If it's a Network.enable timeout, try to recover
        if (
          timeoutError.message &&
          timeoutError.message.includes("Network.enable")
        ) {
          console.log(
            "🔄 Detected Network.enable timeout, attempting recovery..."
          );

          // Close the current page and try again
          try {
            await page.close();
          } catch (closeError) {
            console.warn("⚠️ Could not close problematic page:", closeError);
          }

          // Create a new page with minimal configuration
          console.log("🔄 Creating new page with minimal configuration...");
          page = await browser.newPage();

          // Set only essential timeouts
          page.setDefaultTimeout(60000);
          page.setDefaultNavigationTimeout(60000);
          console.log("✅ Recovery successful");
        } else {
          throw new Error(`Failed to set page timeouts: ${timeoutError}`);
        }
      }

      // Wait for page to be fully initialized
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if page is still valid before setting properties
      if (page.isClosed()) {
        throw new Error("Page was closed unexpectedly during initialization");
      }

      // Set user agent with safe operation
      await safePageOperation(
        page,
        () =>
          page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          ),
        "setting user agent"
      );
      console.log("✅ User agent set successfully");

      // Set viewport with safe operation
      await safePageOperation(
        page,
        () => page.setViewport({ width: 1366, height: 768 }),
        "setting viewport"
      );
      console.log("✅ Viewport set successfully");

      const results: ButtonClickResult[] = [];
      const visited = new Set<string>();
      const checkedElements = new Set<string>();

      console.log(`🌐 Navigating to: ${url}`);

      // Enhanced page navigation with safe operation
      await safePageOperation(
        page,
        () =>
          page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000, // Increased timeout for Docker
          }),
        "navigation"
      );
      console.log("✅ Page loaded successfully");
      await new Promise((res) => setTimeout(res, 1000));

      // Initialize consistent UI state for testing
      if (await isPageHealthy(page)) {
        await ensureConsistentSidebarState(page);

        // Set up timeout for analysis
        const analysisTimeout = setTimeout(() => {
          console.warn("⏰ Analysis timeout reached, stopping...");
          if (browser && browser.isConnected()) {
            browser.close().catch(console.error);
          }
        }, maxAnalysisTime);

        try {
          // Only run auth handler if the final URL is an auth page
          if (await isAuthPage(page)) {
            await handleAuthPage(page, results, url, visited, checkedElements);
          } else {
            await analyzePage(page, url, visited, results, checkedElements);
          }
        } finally {
          clearTimeout(analysisTimeout);
        }
      } else {
        throw new Error("Page became unhealthy before analysis");
      }
      const analysisEnd = Date.now();
      if (!analysisCompleted) {
        analysisCompleted = true;
      }
      try {
        if (browser && !browser.isConnected()) {
          console.log("🔌 Browser already disconnected, skipping close");
        } else {
          console.log("🔒 Closing browser...");
          await browser.close();
          console.log("✅ Browser closed successfully");
        }
      } catch (closeErr: any) {
        console.error("❌ Error closing browser:", closeErr.message);
        if (closeErr.code === "EPERM" || closeErr.code === "EACCES") {
          console.log("⚠️ Permission error during browser close, ignoring");
        } else {
          throw closeErr;
        }
      }
      return results;
    } catch (error: any) {
      lastError = error;
      attempt++;

      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      // Handle specific error types
      if (error.message && error.message.includes("TargetCloseError")) {
        console.error(
          "🎯 Target close error detected - page was closed unexpectedly"
        );
      } else if (error.message && error.message.includes("Protocol error")) {
        console.error("🔌 Protocol error detected - connection issue");
      } else if (error.message && error.message.includes("Session closed")) {
        console.error("📱 Session closed error - browser session terminated");
      }

      if (
        error.code === "EPERM" ||
        error.code === "EACCES" ||
        (error.message && error.message.includes("operation not permitted"))
      ) {
        console.log(`⏱️ Retrying in 1 second due to permission error...`);
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      } else {
        console.error(`🛑 Non-recoverable error, stopping retries`);
        break;
      }
    } finally {
      if (browser) {
        try {
          if (browser.isConnected()) {
            console.log("🧹 Cleaning up browser in finally block...");
            await browser.close();
            console.log("✅ Browser cleanup completed");
          }
        } catch (closeErr: any) {
          console.error("❌ Error during browser cleanup:", closeErr.message);
          if (closeErr.code === "EPERM" || closeErr.code === "EACCES") {
            console.log("⚠️ Permission error during cleanup, ignoring");
          } else {
            console.error("🚨 Unexpected error during cleanup:", closeErr);
          }
        }
      }
    }
  }
  throw lastError;
}
