import {Page, Locator} from "@playwright/test";
import {FileHandle, LLM, LMStudioClient, PredictionResult} from "@lmstudio/sdk";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {AIResponseDTO} from "./aiResponse.dto";
import {loadSkill} from "./skillLoader";
import {AIConnection} from "./aiConnection";


export class AIHelper {
    readonly modelName: string;
    readonly maxAttempts: number;
    readonly client: LMStudioClient;
    readonly page: Page;

    /** Static system prompt (role + instructions + xpath skill), built once and reused
     *  so it stays a stable cached prefix across every prediction. */
    private xpathSystemPrompt?: string;

    constructor(page: Page) {
        this.page = page;
        // Reuse the single, shared LM Studio connection instead of opening a new
        // one per helper/test. See {@link AIConnection}.
        const connection: AIConnection = AIConnection.getInstance();
        this.client = connection.client;
        this.modelName = connection.modelName;
        this.maxAttempts = connection.maxAttempts;
    }

    async askQuestion(question: string, image?: FileHandle, system?: string): Promise<AIResponseDTO> {
        const model: LLM = await this.client.llm.model(this.modelName);

        const messages = [
            ...(system ? [{role: "system" as const, content: system}] : []),
            {role: "user" as const, content: question, images: image ? [image] : undefined}
        ];

        const result: PredictionResult = await model.respond(messages);

        const incomingTokens: number = result.stats?.promptTokensCount ?? 0;
        const outgoingTokens: number = result.stats?.predictedTokensCount ?? 0;
        console.log(`Tokens - Incoming: ${incomingTokens}, Outgoing: ${outgoingTokens}`);

        return {
            response: result.nonReasoningContent,
            incomingTokens,
            outgoingTokens
        };
    }

    async getLocatorFromAi(description: string, withImage: boolean = false): Promise<Locator> {
        console.log(`Generating locator for: "${description}"`);

        // Whether the described interaction is text entry. If so, the located element
        // must be editable; a <button>/<a> answer is rejected and re-queried instead of
        // blindly trusted (it never can be filled).
        const requiresEditable: boolean = this.descriptionRequiresEditable(description);
        const rejectedSelectors: string[] = [];

        for (let attempt: number = 1; attempt <= this.maxAttempts; attempt++) {
            const html: string = this.sanitizeHtml(await this.page.content());
            const imageFileHandle: FileHandle | undefined = withImage
                ? await this.captureScreenshot(description)
                : undefined;

            const userPrompt: string = this.buildUserPrompt(html, description, rejectedSelectors);
            const aiResponse: AIResponseDTO = await this.askQuestion(userPrompt, imageFileHandle, this.buildSystemPrompt());
            const selector: string = this.cleanSelector(aiResponse.response);

            console.log(`AI identified selector for "${description}" (attempt ${attempt}/${this.maxAttempts}): "${selector}"`);

            if (!selector) {
                console.warn(`Empty selector returned for "${description}", retrying...`);
                continue;
            }

            const locator: Locator | undefined = await this.resolveLocator(selector, description);
            if (!locator) {
                continue;
            }

            if (requiresEditable && !(await this.isLocatorEditable(locator))) {
                console.warn(`Selector "${selector}" for "${description}" matched a non-editable element (e.g. a <button>) but the description requires text entry; rejecting and retrying...`);
                rejectedSelectors.push(selector);
                continue;
            }

            return locator;
        }

        throw new Error(`Failed to find a relevant locator for "${description}" after ${this.maxAttempts} attempts`);
    }

    /** Heuristic: does the description ask for typing into an editable element? */
    private descriptionRequiresEditable(description: string): boolean {
        return /\b(input|type|typing|fill(ing)?|enter(ing)?\s+text|search\s*(box|field|bar)|text\s*(box|field|area)|textarea|editable|write)\b/i.test(description);
    }

    /** True when the resolved element accepts text entry (input/textarea/contenteditable). */
    private async isLocatorEditable(locator: Locator): Promise<boolean> {
        try {
            return await locator.isEditable({timeout: 2_000});
        } catch {
            // isEditable throws for non-editable tags (<button>, <a>, …) → treat as not editable.
            return false;
        }
    }

    private async captureScreenshot(description: string): Promise<FileHandle> {
        const imageBuffer: Buffer = await this.page.screenshot({fullPage: true, quality: 30, type: "jpeg"});

        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, {recursive: true});
        }
        const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}.jpeg`);
        console.debug(`temp File Path for screenshot for "${description}":\n ${tempFilePath}`);
        fs.writeFileSync(tempFilePath, imageBuffer);
        return this.client.files.prepareImage(tempFilePath);
    }

    /**
     * Static instructions + xpath skill. Kept identical across every call (and lazily
     * built once) so LM Studio can reuse this as a cached prompt prefix instead of
     * re-evaluating the skill on each prediction.
     */
    private buildSystemPrompt(): string {
        if (this.xpathSystemPrompt === undefined) {
            const xpathSkills: string = loadSkill("get-xpath.md");

            this.xpathSystemPrompt = `You are a helper that finds a Playwright locator/selector for a given element in the HTML.

INSTRUCTIONS (apply strictly in this order):
1. FIRST, decide the REQUIRED element TYPE from the described interaction. This is a hard filter that you MUST apply before looking at any attributes:
   - If the description implies a "click", "press", "open", "submit", or selecting a link/button, the target is an interactive element such as <button>, <a>, or [role='button'].
   - If the description implies "entering text", "input field", "search box/field", "inputting", "typing", "searching", or "filling", the target MUST be an editable element: an <input>, <textarea>, or a [contenteditable] element (which can be a <div> or <p>). You MUST NOT return a <button>, <a>, <label>, or any non-editable container — even if its text, 'aria-label', or 'id' semantically matches the description. For example, a "Search" button that opens a search box is NOT the editable field; you must pick the actual <input>, not the trigger button.
2. Choose the element matching the description ONLY from among the elements of that required type.
3. THEN build the selector for that chosen element, preferring in this order:
   a. a unique 'id' (e.g. "#id-value" or "//*[@id='id-value']").
   b. a unique 'data-test' / 'data-testid' / 'name' attribute (e.g. "[data-test='value']" or "//*[@data-test='value']").
   c. otherwise a unique 'aria-label', visible text, or structural XPath.
4. Make sure the tag name (e.g. "input", "button", "a", "div") in your selector matches the tag name of the actual target element in the HTML. Do not confuse a container or a trigger element with the interactive element itself.
5. ***When possible, prefer using an XPath selector*** and return ONLY the raw XPath selector or CSS selector ONLY that can be passed directly to Playwright's page.locator() (e.g. "#login-button", "input[type='submit']", or "//button[text()='Login']").
6. Keep it as short and precise as possible.
Do not include any other text, markdown formatting (like code blocks with \`\`\`), explanation, or other code. Return strictly the selector string itself.

Additional reference guidelines:
${xpathSkills}`;
        }

        return this.xpathSystemPrompt;
    }

    /**
     * Strip the token-heavy, locator-irrelevant parts of the page so the prompt fits
     * the model's context window. Raw page HTML (especially on ad-laden pages like
     * demoqa) easily exceeds the model's `n_ctx`, which makes LM Studio reject the
     * request with "n_keep >= n_ctx" before it generates anything.
     *
     * We drop <script>/<style>/<svg>/<noscript> blocks and HTML comments entirely —
     * none of them are needed to find a Playwright selector — then collapse runs of
     * whitespace. The interactive elements and their id/name/aria/text attributes,
     * which are all the model actually needs, are preserved.
     */
    private sanitizeHtml(html: string): string {
        return html
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
            .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Variable part of the request. The page HTML comes first (stable across element
     * lookups on the same page → also cacheable) and the per-call description last.
     */
    private buildUserPrompt(html: string, description: string, rejectedSelectors: string[] = []): string {
        const avoid: string = rejectedSelectors.length > 0
            ? `\n\nDO NOT return any of these selectors — they matched a non-editable element (such as a <button>) but the description requires an editable input. Find the actual editable element instead: ${rejectedSelectors.map((s: string) => `"${s}"`).join(", ")}.`
            : "";

        return `Given the following HTML of the page:
${html}

***FIND THE LOCATOR/SELECTOR FOR THE ELEMENT DESCRIBED AS: "${description}"***${avoid}`;
    }

    private cleanSelector(rawResponse: string): string {
        let selector: string = rawResponse.trim();

        selector = selector.replace(/```(xpath|css|javascript|typescript|html)?/gi, "").replace(/```/g, "").trim();

        const lines: string[] = selector.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        if (lines.length > 0) {
            selector = lines[0];
        }

        selector = selector.replace(/<[^>]+>/g, "").trim();

        if ((selector.startsWith('"') && selector.endsWith('"')) || (selector.startsWith("'") && selector.endsWith("'"))) {
            selector = selector.slice(1, -1).trim();
        }

        return selector;
    }

    private async resolveLocator(selector: string, description: string): Promise<Locator | undefined> {
        try {
            const locator: Locator = this.page.locator(selector);
            const count: number = await locator.count();
            if (count > 0) {
                return locator;
            }
            await this.page.waitForTimeout(5000);
            console.warn(`Selector "${selector}" matched no elements for "${description}", retrying...`);
        } catch (error: unknown) {
            console.warn(`Invalid selector "${selector}" for "${description}": retrying...`);
        }
        return undefined;
    }
}


