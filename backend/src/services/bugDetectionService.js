"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeButtonClicks = analyzeButtonClicks;
const puppeteer_1 = __importDefault(require("puppeteer"));
function analyzeButtonClicks(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({ headless: true });
        const page = yield browser.newPage();
        const results = [];
        try {
            yield page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
            // Get all button selectors and text
            const buttons = yield page.$$eval("button", (nodes) => nodes.map((el, idx) => ({
                selector: `button:nth-of-type(${idx + 1})`,
                textContent: el.innerText,
            })));
            for (const btn of buttons) {
                // Reload the page for each button to reset state
                yield page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
                const urlBefore = page.url();
                const contentBefore = yield page.content();
                // Try clicking the button
                let navigated = false;
                let contentChanged = false;
                let urlAfter = urlBefore;
                let bugType;
                let description;
                try {
                    yield page.waitForSelector(btn.selector, { timeout: 2000 });
                    yield page.click(btn.selector);
                    // Wait for possible navigation or content change
                    yield new Promise((resolve) => setTimeout(resolve, 2000));
                    urlAfter = page.url();
                    navigated = urlAfter !== urlBefore;
                    const contentAfter = yield page.content();
                    contentChanged = contentAfter !== contentBefore;
                    // Check if the button's text implies navigation or content change
                    if (!navigated && !contentChanged) {
                        bugType = "NoAction";
                        description = `Button \"${btn.textContent}\" did not cause navigation or visible content change.`;
                    }
                }
                catch (e) {
                    bugType = "ClickError";
                    description = `Error clicking button \"${btn.textContent}\": ${e.message}`;
                }
                results.push(Object.assign(Object.assign({}, btn), { navigated,
                    urlBefore,
                    urlAfter,
                    contentChanged,
                    bugType,
                    description }));
            }
        }
        finally {
            yield browser.close();
        }
        return results;
    });
}
