import { Page, Locator } from "@playwright/test";
import { LMStudioClient } from "@lmstudio/sdk";
import * as fs from "fs";
import * as path from "path";

/**
 * Asks a question to the local AI using the LM Studio SDK.
 * Assumes the LM Studio server is running on localhost port 1234.
 *
 * @param question The text question to ask the AI.
 * @returns The parsed text response from the AI.
 */
export interface AIResponseDTO {
    response: string;
    incomingTokens: number;
    outgoingTokens: number;
}

export async function askQuestion(question: string): Promise<AIResponseDTO> {
    const modelName = 'google/gemma-4-e4b';
    // Initialize the LM Studio client to point to localhost on port 1234
    const client = new LMStudioClient({
        baseUrl: "ws://127.0.0.1:1234"
    });

    try {
        // Load or connect to the specified model
        const model = await client.llm.model(modelName);

        // Send the prompt and wait for the response
        const result = await model.respond(question);

        // Return the DTO
        return {
            response: result.content,
            incomingTokens: result.stats?.promptTokensCount ?? 0,
            outgoingTokens: result.stats?.predictedTokensCount ?? 0
        };
    } catch (error) {
        console.error("Error asking question via LM Studio SDK:", error);
        throw error;
    }
}

/**
 * Gets a Playwright Locator using local AI based on the page's HTML content and an element description.
 *
 * @param page The Playwright Page object.
 * @param description The description of the target element.
 * @returns A Playwright Locator for the element.
 */
export async function getLocatorFromAi(page: Page, description: string): Promise<Locator> {
    const html = await page.content();
    
    let xpathSkills = "";
    try {
        const xpathSkillsPath = path.join(__dirname, "skills", "get-xpath.md");
        xpathSkills = fs.readFileSync(xpathSkillsPath, "utf8");
    } catch (error) {
        console.warn("Could not read skills/get-xpath.md guidelines, proceeding without it:", error);
    }

    const prompt = `You are a helper that finds a Playwright locator/selector for a given element in the HTML.
Given the following HTML of the page:
${html}

Find the locator/selector for the element described as: "${description}"

INSTRUCTIONS:
1. If the target element has a unique 'id' attribute, you must use it (e.g. "#id-value" or "//*[@id='id-value']").
2. If the target element has a unique 'data-test' or 'data-testid' or 'name' attribute, you must use it (e.g. "[data-test='value']" or "//*[@data-test='value']").
3. Make sure the tag name (e.g. "input", "button", "a", "div") in your selector matches the tag name of the actual target element in the HTML. Do not confuse a container (like a <div>) with the interactive element itself (like an <input>).
4. Return ONLY the raw CSS selector or XPath selector that can be passed directly to Playwright's page.locator() (e.g. "#login-button", "input[type='submit']", or "//button[text()='Login']"). 
Do not include any other text, markdown formatting (like code blocks with \`\`\`), explanation, or other code. Return strictly the selector string itself.

Additional reference guidelines:
${xpathSkills}`;

    const aiResponse = await askQuestion(prompt);
    console.log(`RAW AI RESPONSE for "${description}":`, JSON.stringify(aiResponse.response));
    
    // Clean response
    let selector = aiResponse.response.trim();
    
    // Remove thought / channel blocks by scanning for known closing markers
    const markers = ['<channel|>', '</thought>', '</details>', '<|channel|>', '<|channel>', '<channel>'];
    for (const marker of markers) {
        const lastIdx = selector.lastIndexOf(marker);
        if (lastIdx !== -1) {
            selector = selector.slice(lastIdx + marker.length).trim();
            break;
        }
    }
    
    // Remove <thought>...</thought> block entirely if present
    selector = selector.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    // Remove <details>...</details> block entirely if present
    selector = selector.replace(/<details>[\s\S]*?<\/details>/gi, '').trim();
    
    // Strip codeblock indicators if present (e.g. ```xpath, ```css, ```)
    selector = selector.replace(/```(xpath|css|javascript|typescript|html)?/gi, '').replace(/```/g, '').trim();
    
    // Split by lines and take the first non-empty line
    const lines = selector.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
        selector = lines[0];
    }
    
    // Strip tags/tokens like <channel|> or <control_token>
    selector = selector.replace(/<[^>]+>/g, '').trim();
    
    // Strip quotes if the AI wrapped it in quotes
    if ((selector.startsWith('"') && selector.endsWith('"')) || (selector.startsWith("'") && selector.endsWith("'"))) {
        selector = selector.slice(1, -1).trim();
    }
    
    console.log(`AI identified selector for "${description}": "${selector}"`);
    return page.locator(selector);
}
