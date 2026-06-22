import {Locator} from "@playwright/test";
import {AIHelper} from "./aiHelper";

/**
 * High-level wrapper that resolves an element from a natural-language
 * description (via {@link AIHelper.getLocatorFromAi}) and then performs a
 * basic Playwright action on it.
 *
 * Every method accepts a human description of the target element, e.g.
 * `await aiActions.click("login button")`. An optional `timeout` (ms) can be
 * passed per action and is forwarded to the underlying Playwright call, e.g.
 * `await aiActions.click("login button", false, 10_000)`.
 */
export class AIActions {
    private readonly aiHelper: AIHelper;

    constructor(aiHelper: AIHelper) {
        this.aiHelper = aiHelper;
    }

    /**
     * Resolve the underlying Playwright {@link Locator} for a description,
     * in case a caller needs to perform an action not covered here.
     */
    async locate(description: string, withImage: boolean = false): Promise<Locator> {
        return this.aiHelper.getLocatorFromAi(description, withImage);
    }

    /** Click the element matching the description. */
    async click(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.click({timeout});
    }

    /** Double-click the element matching the description. */
    async doubleClick(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.dblclick({timeout});
    }

    /** Fill an editable element (input, textarea, contenteditable) with text. */
    async fill(description: string, value: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.fill(value, {timeout});
    }

    /** Type text character by character into a focused element. */
    async type(description: string, value: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.pressSequentially(value, {timeout});
    }

    /** Clear the value of an editable element. */
    async clear(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.clear({timeout});
    }

    /** Return the visible inner text of the element. */
    async getText(description: string, withImage: boolean = false, timeout?: number): Promise<string> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.innerText({timeout});
    }

    /** Return the raw textContent of the element (may be null). */
    async getTextContent(description: string, withImage: boolean = false, timeout?: number): Promise<string | null> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.textContent({timeout});
    }

    /** Return the value of an element's attribute (null if absent). */
    async getAttribute(description: string, attribute: string, withImage: boolean = false, timeout?: number): Promise<string | null> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.getAttribute(attribute, {timeout});
    }

    /** Return the `value` of an input/textarea/select element. */
    async getInputValue(description: string, withImage: boolean = false, timeout?: number): Promise<string> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.inputValue({timeout});
    }

    /** Check a checkbox or radio element. */
    async check(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.check({timeout});
    }

    /** Uncheck a checkbox element. */
    async uncheck(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.uncheck({timeout});
    }

    /** Select option(s) in a <select> element by value, label, or index. */
    async selectOption(description: string, values: string | string[], withImage: boolean = false, timeout?: number): Promise<string[]> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.selectOption(values, {timeout});
    }

    /** Hover over the element. */
    async hover(description: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.hover({timeout});
    }

    /** Focus the element and press a key (or key combination), e.g. "Enter". */
    async press(description: string, key: string, withImage: boolean = false, timeout?: number): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.press(key, {timeout});
    }

    /** Wait for the element matching the description to reach the given state (default "visible"). */
    async waitFor(
        description: string,
        state: "attached" | "visible" | "hidden" = "visible",
        withImage: boolean = false,
        timeout?: number
    ): Promise<void> {
        const locator: Locator = await this.locate(description, withImage);
        await locator.waitFor({state, timeout});
    }

    /** Whether the element is visible on the page. */
    async isVisible(description: string, withImage: boolean = false, timeout?: number): Promise<boolean> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.isVisible({timeout});
    }

    /** Whether a checkbox/radio element is currently checked. */
    async isChecked(description: string, withImage: boolean = false, timeout?: number): Promise<boolean> {
        const locator: Locator = await this.locate(description, withImage);
        return locator.isChecked({timeout});
    }
}
