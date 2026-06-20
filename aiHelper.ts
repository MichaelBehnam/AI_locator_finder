import {Page, Locator} from "@playwright/test";
import {FileHandle, LLM, LMStudioClient, PredictionResult} from "@lmstudio/sdk";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {AIResponseDTO} from "./aiResponse.dto";


export class AIHelper {
    readonly ip: string;
    readonly port: string;
    readonly modelName: string;
    readonly client: LMStudioClient;
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
        this.ip = process.env.AI_IP ?? "127.0.0.1";
        this.port = process.env.AI_PORT ?? "1234";
        this.modelName = process.env.MODEL_NAME ?? "google/gemma-4-e4b";
        this.client = new LMStudioClient({baseUrl: `ws://${this.ip}:${this.port}`});
    }

    async askQuestion(question: string, image?: FileHandle): Promise<AIResponseDTO> {
        const model: LLM = await this.client.llm.model(this.modelName);

        const result: PredictionResult = await model.respond([
            {role: "user", content: question, images: image ? [image] : undefined}
        ]);

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

        const html: string = await this.page.content();
        let imageFileHandle: FileHandle | undefined = undefined;

        if (withImage) {
            const imageBuffer: Buffer = await this.page.screenshot({fullPage: true, quality: 30, type: "jpeg"});

            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, {recursive: true});
            }
            const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}.jpeg`);
            console.debug(`temp File Path for screenshot for "${description}":\n ${tempFilePath}`);
            fs.writeFileSync(tempFilePath, imageBuffer);
            imageFileHandle = await this.client.files.prepareImage(tempFilePath);
        }

        let xpathSkills: string = "";
        try {
            xpathSkills = fs.readFileSync(path.join(__dirname, "skills", "get-xpath.md"), "utf8");
        } catch (error: unknown) {
            throw ("Could not read skills/get-xpath.md guidelines, proceeding without it:" + error);
        }

        const prompt: string = `You are a helper that finds a Playwright locator/selector for a given element in the HTML.
Given the following HTML of the page:
${html}

***FIND THE LOCATOR/SELECTOR FOR THE ELEMENT DESCRIBED AS: "${description}"***

INSTRUCTIONS:
1. If the target element has a unique 'id' attribute, you must use it (e.g. "#id-value" or "//*[@id='id-value']").
2. If the target element has a unique 'data-test' or 'data-testid' or 'name' attribute, you must use it (e.g. "[data-test='value']" or "//*[@data-test='value']").
3. Pay attention to all kinds of elements based on the implied action:
   - If the description implies a "click" action, the target is usually a <button>, <a>, or similar interactive element.
   - If the description implies "entering text","input field", "inputting", or "searching", the target element MUST be an editable element such as an <input>, <textarea>, or a [contenteditable] element (which can be a <div> or <p>). You MUST NOT return a <button> or a non-editable container.
4. Make sure the tag name (e.g. "input", "button", "a", "div") in your selector matches the tag name of the actual target element in the HTML. Do not confuse a container (like a <div>) with the interactive element itself unless the container is the intended interactive element.
5. ***When possible, prefer using an XPath selector*** and return ONLY the raw XPath selector or CSS selector ONLY that can be passed directly to Playwright's page.locator() (e.g. "#login-button", "input[type='submit']", or "//button[text()='Login']").
6. Keep it as short and precise as possible.
Do not include any other text, markdown formatting (like code blocks with \`\`\`), explanation, or other code. Return strictly the selector string itself.

Additional reference guidelines:
${xpathSkills}`;

        const aiResponse: AIResponseDTO = await this.askQuestion(prompt, imageFileHandle);

        let selector: string = aiResponse.response.trim();

        selector = selector.replace(/```(xpath|css|javascript|typescript|html)?/gi, "").replace(/```/g, "").trim();

        const lines: string[] = selector.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        if (lines.length > 0) {
            selector = lines[0];
        }

        selector = selector.replace(/<[^>]+>/g, "").trim();

        if ((selector.startsWith('"') && selector.endsWith('"')) || (selector.startsWith("'") && selector.endsWith("'"))) {
            selector = selector.slice(1, -1).trim();
        }

        console.log(`AI identified selector for "${description}": "${selector}"`);
        return this.page.locator(selector);
    }
}


