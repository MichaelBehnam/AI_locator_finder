import { test, expect } from "../fixtures";
import { AIActionIntentDTO } from "../aiActionIntent.dto";

test.describe("AI Smart Actions", () => {
    test("infers the action from the instruction without executing it", async ({ page, aiSmartActions }) => {
        test.setTimeout(120_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState("domcontentloaded");

        // The model should classify each instruction into the right action + target (+ value).
        const fillIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("type standard_user into the username field");
        expect(fillIntent.action).toBe("fill");
        expect(fillIntent.value).toBe("standard_user");

        const clickIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the login button");
        expect(clickIntent.action).toBe("click");

        const readIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("read the error message text");
        expect(readIntent.action).toBe("getText");
    });

    test("logs in by letting the AI choose each action from the instruction", async ({ page, aiSmartActions }) => {
        test.setTimeout(180_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState("domcontentloaded");

        // Each instruction is free-form: the class decides whether it's a fill, click, etc.
        await aiSmartActions.perform("enter standard_user into the username input field");
        await aiSmartActions.perform("fill the password field with secret_sauce");
        await aiSmartActions.perform("click the login button");
        await page.waitForURL("**/inventory.html");

        // A "read" instruction should resolve to getText and return a string.
        const title: unknown =
            await aiSmartActions.perform("read the section title shown above the products grid");
        expect(typeof title).toBe("string");
        expect(title as string).toContain("Products");

        // A "checkbox/visibility" style instruction should resolve to a boolean.
        const cartVisible: unknown = await aiSmartActions.perform("is the shopping cart link visible");
        expect(cartVisible).toBe(true);
    });

    test("runs a sequence of instructions in order with performAll", async ({ page, aiSmartActions }) => {
        test.setTimeout(180_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState("domcontentloaded");

        await aiSmartActions.performAll([
            "enter standard_user into the username field",
            "enter secret_sauce into the password field",
            "click the login button"
        ]);

        await page.waitForURL("**/inventory.html");

        await aiSmartActions.perform("click the add to cart button for Sauce Labs Backpack");
        await aiSmartActions.perform("open the shopping cart");
        await page.waitForURL("**/cart.html");

        const badge: unknown = await aiSmartActions.perform("read the shopping cart badge item count");
        expect(badge as string).toBe("1");
    });
});
