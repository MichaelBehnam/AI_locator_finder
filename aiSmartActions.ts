import {AIHelper} from "./aiHelper";
import {AIActions} from "./aiActions";
import {AIResponseDTO} from "./aiResponse.dto";
import {AIActionIntentDTO, AIActionType} from "./aiActionIntent.dto";
import {loadSkill} from "./skillLoader";

type WaitForState = "attached" | "visible" | "hidden";

/**
 * Maps loosely-formatted action names the model might return (e.g. "double_click",
 * "DOUBLECLICK", "get text") to the canonical {@link AIActionType} values.
 * Keys are normalized with {@link AISmartActions.normalizeActionKey}.
 */
const ACTION_ALIASES: Readonly<Record<string, AIActionType>> = {
    click: "click",
    tap: "click",
    press: "press",
    doubleclick: "doubleClick",
    dblclick: "doubleClick",
    fill: "fill",
    enter: "fill",
    set: "fill",
    type: "type",
    clear: "clear",
    gettext: "getText",
    text: "getText",
    read: "getText",
    getattribute: "getAttribute",
    attribute: "getAttribute",
    getinputvalue: "getInputValue",
    inputvalue: "getInputValue",
    value: "getInputValue",
    check: "check",
    uncheck: "uncheck",
    selectoption: "selectOption",
    select: "selectOption",
    hover: "hover",
    isvisible: "isVisible",
    visible: "isVisible",
    ischecked: "isChecked",
    checked: "isChecked",
    waitfor: "waitFor",
    wait: "waitFor"
};

/**
 * One step above {@link AIActions}: instead of you naming the action, the AI
 * *infers* which action a free-form instruction implies, extracts the target
 * element and any value it needs, then dispatches to the matching
 * {@link AIActions} method.
 *
 * @example
 * await smart.perform("type standard_user into the username field");
 * await smart.perform("click the login button");
 * const title = await smart.perform("read the page title above the products grid");
 */
export class AISmartActions {
    private readonly aiHelper: AIHelper;
    private readonly aiActions: AIActions;

    /** Static intent-classifier system prompt, built once so it stays a cached prefix. */
    private intentSystemPrompt?: string;

    constructor(aiHelper: AIHelper, aiActions: AIActions = new AIActions(aiHelper)) {
        this.aiHelper = aiHelper;
        this.aiActions = aiActions;
    }

    /**
     * Infer the action from `instruction` and execute it via {@link AIActions}.
     * Returns whatever the underlying action returns (void, string, boolean, …).
     *
     * @param instruction Free-form command, e.g. "check the remember-me box".
     * @param withImage   Forwarded to the locator step (send a screenshot too).
     * @param timeout     Forwarded to the underlying Playwright call (ms).
     */
    async perform(instruction: string, withImage: boolean = false, timeout?: number): Promise<unknown> {
        const intent: AIActionIntentDTO = await this.resolveIntent(instruction);
        return this.dispatch(intent, withImage, timeout);
    }

    /**
     * Run a sequence of instructions in order, returning each step's result.
     */
    async performAll(instructions: string[], withImage: boolean = false, timeout?: number): Promise<unknown[]> {
        const results: unknown[] = [];
        for (const instruction of instructions) {
            results.push(await this.perform(instruction, withImage, timeout));
        }
        return results;
    }

    /**
     * Ask the AI to classify `instruction` into a structured {@link AIActionIntentDTO}
     * without executing anything. Useful for asserting the inferred action in tests.
     */
    async resolveIntent(instruction: string): Promise<AIActionIntentDTO> {
        const aiResponse: AIResponseDTO = await this.aiHelper.askQuestion(
            this.buildIntentUserPrompt(instruction),
            undefined,
            this.buildIntentSystemPrompt()
        );
        const intent: AIActionIntentDTO = this.parseIntent(aiResponse.response, instruction);

        console.log(
            `Inferred action for "${instruction}": ${intent.action} -> target: "${intent.target}"` +
            (intent.value ? `, value: "${intent.value}"` : "")
        );

        return intent;
    }

    /** Route a resolved intent to the matching {@link AIActions} method. */
    private dispatch(intent: AIActionIntentDTO, withImage: boolean, timeout?: number): Promise<unknown> {
        const target: string = intent.target;
        const value: string = intent.value ?? "";

        switch (intent.action) {
            case "click":
                return this.aiActions.click(target, withImage, timeout);
            case "doubleClick":
                return this.aiActions.doubleClick(target, withImage, timeout);
            case "fill":
                this.requireValue(intent);
                return this.aiActions.fill(target, value, withImage, timeout);
            case "type":
                this.requireValue(intent);
                return this.aiActions.type(target, value, withImage, timeout);
            case "clear":
                return this.aiActions.clear(target, withImage, timeout);
            case "getText":
                return this.aiActions.getText(target, withImage, timeout);
            case "getAttribute":
                this.requireValue(intent);
                return this.aiActions.getAttribute(target, value, withImage, timeout);
            case "getInputValue":
                return this.aiActions.getInputValue(target, withImage, timeout);
            case "check":
                return this.aiActions.check(target, withImage, timeout);
            case "uncheck":
                return this.aiActions.uncheck(target, withImage, timeout);
            case "selectOption":
                this.requireValue(intent);
                return this.aiActions.selectOption(target, value, withImage, timeout);
            case "hover":
                return this.aiActions.hover(target, withImage, timeout);
            case "press":
                this.requireValue(intent);
                return this.aiActions.press(target, value, withImage, timeout);
            case "isVisible":
                return this.aiActions.isVisible(target, withImage, timeout);
            case "isChecked":
                return this.aiActions.isChecked(target, withImage, timeout);
            case "waitFor":
                return this.aiActions.waitFor(target, this.toWaitState(value), withImage, timeout);
            default:
                // Exhaustiveness guard: if AIActionType grows, this surfaces the gap.
                throw new Error(`Unsupported action "${(intent as AIActionIntentDTO).action}" for instruction.`);
        }
    }

    private requireValue(intent: AIActionIntentDTO): void {
        if (!intent.value || intent.value.trim().length === 0) {
            throw new Error(`Action "${intent.action}" requires a value but none was inferred from the instruction.`);
        }
    }

    private toWaitState(value: string): WaitForState {
        const normalized: string = value.trim().toLowerCase();
        if (normalized === "attached" || normalized === "hidden") {
            return normalized;
        }
        return "visible";
    }

    /**
     * Static classifier rules. Identical for every instruction (and built once) so
     * LM Studio reuses it as a cached prompt prefix instead of re-evaluating it each call.
     * Loaded from skills/infer-action-intent.md.
     */
    private buildIntentSystemPrompt(): string {
        if (this.intentSystemPrompt === undefined) {
            this.intentSystemPrompt = loadSkill("infer-action-intent.md");
        }
        return this.intentSystemPrompt;
    }

    /** Variable part of the request: just the instruction to classify. */
    private buildIntentUserPrompt(instruction: string): string {
        return `INSTRUCTION: "${instruction}"`;
    }

    /** Strip markdown/quotes, parse the JSON object, and validate it. */
    private parseIntent(rawResponse: string, instruction: string): AIActionIntentDTO {
        let text: string = rawResponse.trim();
        text = text.replace(/```(json|javascript|typescript)?/gi, "").replace(/```/g, "").trim();

        const start: number = text.indexOf("{");
        const end: number = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end < start) {
            throw new Error(`Could not find a JSON object in the AI response for "${instruction}": ${rawResponse}`);
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
        } catch (error: unknown) {
            throw new Error(`Failed to parse intent JSON for "${instruction}" from response "${rawResponse}": ${error}`);
        }

        const action: AIActionType = this.resolveAction(parsed.action, instruction, rawResponse);
        const target: string = typeof parsed.target === "string" && parsed.target.trim().length > 0
            ? parsed.target.trim()
            : instruction;
        const value: string | undefined = typeof parsed.value === "string" && parsed.value.length > 0
            ? parsed.value
            : undefined;

        return {action, target, value};
    }

    private resolveAction(rawAction: unknown, instruction: string, rawResponse: string): AIActionType {
        if (typeof rawAction !== "string") {
            throw new Error(`AI response for "${instruction}" had no string "action" field: ${rawResponse}`);
        }
        const canonical: AIActionType | undefined = ACTION_ALIASES[this.normalizeActionKey(rawAction)];
        if (!canonical) {
            throw new Error(`AI returned an unsupported action "${rawAction}" for "${instruction}".`);
        }
        return canonical;
    }

    private normalizeActionKey(action: string): string {
        return action.toLowerCase().replace(/[^a-z]/g, "");
    }
}
