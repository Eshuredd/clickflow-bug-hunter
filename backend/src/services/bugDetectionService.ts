
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
  elementType: string;
  isVisible: boolean;
}

export async function analyzeButtonClicks(
  url: string
): Promise<ButtonClickResult[]> {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const results: ButtonClickResult[] = [];

  try {
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Get all clickable elements with better selectors
    const clickableElements = await page.evaluate(() => {
      const elements: Array<{
        selector: string;
        textContent: string;
        elementType: string;
        isVisible: boolean;
        tagName: string;
        href?: string;
        type?: string;
      }> = [];

      // Function to check if element is visible
      const isElementVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.getBoundingClientRect().width > 0 &&
               el.getBoundingClientRect().height > 0;
      };

      // Function to generate a unique selector for an element
      const generateSelector = (element: Element): string => {
        if (element.id) {
          return `#${element.id}`;
        }
        
        const tagName = element.tagName.toLowerCase();
        const className = element.className ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
        
        if (className) {
          const selectorWithClass = `${tagName}${className}`;
          if (document.querySelectorAll(selectorWithClass).length === 1) {
            return selectorWithClass;
          }
        }
        
        // Fallback to xpath-like selector
        const path: string[] = [];
        let current: Element | null = element;
        
        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase();
          const siblings = Array.from(current.parentElement?.children || [])
            .filter(sibling => sibling.tagName === current!.tagName);
          
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
          
          path.unshift(selector);
          current = current.parentElement;
        }
        
        return path.join(' > ');
      };

      // Find all button elements
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button) => {
        elements.push({
          selector: generateSelector(button),
          textContent: button.textContent?.trim() || '',
          elementType: 'button',
          isVisible: isElementVisible(button),
          tagName: 'BUTTON',
          type: button.getAttribute('type') || 'button'
        });
      });

      // Find all clickable links
      const links = document.querySelectorAll('a[href]');
      links.forEach((link) => {
        elements.push({
          selector: generateSelector(link),
          textContent: link.textContent?.trim() || '',
          elementType: 'link',
          isVisible: isElementVisible(link),
          tagName: 'A',
          href: link.getAttribute('href') || ''
        });
      });

      // Find all input submit buttons
      const submitInputs = document.querySelectorAll('input[type="submit"], input[type="button"]');
      submitInputs.forEach((input) => {
        elements.push({
          selector: generateSelector(input),
          textContent: (input as HTMLInputElement).value || '',
          elementType: 'input-button',
          isVisible: isElementVisible(input),
          tagName: 'INPUT',
          type: (input as HTMLInputElement).type
        });
      });

      // Find elements with click event listeners (more advanced detection)
      const clickableByEvents = document.querySelectorAll('[onclick], [data-click], .btn, .button');
      clickableByEvents.forEach((element) => {
        // Avoid duplicates
        if (!['BUTTON', 'A', 'INPUT'].includes(element.tagName)) {
          elements.push({
            selector: generateSelector(element),
            textContent: element.textContent?.trim() || '',
            elementType: 'clickable-element',
            isVisible: isElementVisible(element),
            tagName: element.tagName
          });
        }
      });

      console.log(`Found ${elements.length} clickable elements`);
      return elements;
    });

    console.log(`Detected ${clickableElements.length} clickable elements on the page`);

    // Test each clickable element
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      
      // Skip invisible elements but report them
      if (!element.isVisible) {
        results.push({
          ...element,
          navigated: false,
          urlBefore: url,
          urlAfter: url,
          contentChanged: false,
          bugType: "NotVisible",
          description: `${element.elementType} "${element.textContent}" is not visible to users.`
        });
        continue;
      }

      // Reload the page for each element to reset state
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForTimeout(1000);
      
      const urlBefore = page.url();
      let contentBefore = '';
      
      try {
        contentBefore = await page.content();
      } catch (e) {
        console.log('Could not get page content before click');
      }

      let navigated = false;
      let contentChanged = false;
      let urlAfter = urlBefore;
      let bugType: string | undefined;
      let description: string | undefined;

      try {
        console.log(`Testing element ${i + 1}/${clickableElements.length}: ${element.selector}`);
        
        // Wait for the element to be available
        await page.waitForSelector(element.selector, { timeout: 5000 });
        
        // Check if element is still clickable
        const isClickable = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          
          const style = window.getComputedStyle(el);
          return style.pointerEvents !== 'none' && 
                 !el.hasAttribute('disabled') &&
                 style.display !== 'none';
        }, element.selector);

        if (!isClickable) {
          bugType = "NotClickable";
          description = `${element.elementType} "${element.textContent}" appears clickable but is disabled or has pointer-events: none.`;
        } else {
          // Attempt to click the element
          await page.click(element.selector);
          
          // Wait for potential navigation or content changes
          await page.waitForTimeout(3000);

          urlAfter = page.url();
          navigated = urlAfter !== urlBefore;

          let contentAfter = '';
          try {
            contentAfter = await page.content();
            contentChanged = contentAfter !== contentBefore;
          } catch (e) {
            console.log('Could not get page content after click');
          }

          // Analyze if the click had the expected effect
          if (!navigated && !contentChanged) {
            // Check if it's supposed to be a navigation element
            if (element.elementType === 'link' && element.href && !element.href.startsWith('#') && !element.href.startsWith('javascript:')) {
              bugType = "NoAction";
              description = `Link "${element.textContent}" with href="${element.href}" did not navigate or change content.`;
            } else if (element.elementType === 'button' && element.textContent.toLowerCase().includes('submit')) {
              bugType = "NoAction";
              description = `Submit button "${element.textContent}" did not cause any visible action.`;
            }
            // For other elements, this might be normal behavior (like toggle buttons, modals, etc.)
          }

          console.log(`Element "${element.textContent}": navigated=${navigated}, contentChanged=${contentChanged}`);
        }
      } catch (error) {
        bugType = "ClickError";
        description = `Error clicking ${element.elementType} "${element.textContent}": ${(error as Error).message}`;
        console.log(`Error testing element: ${description}`);
      }

      results.push({
        ...element,
        navigated,
        urlBefore,
        urlAfter,
        contentChanged,
        bugType,
        description
      });
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log(`Analysis complete. Found ${results.length} elements, ${results.filter(r => r.bugType).length} potential issues`);
  return results;
}
