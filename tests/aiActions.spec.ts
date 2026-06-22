import { test, expect } from "../fixtures";

test.describe("AI Actions", () => {
    test("login and read inventory using high-level AI actions", async ({ page, aiActions }) => {
        test.setTimeout(120_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState("domcontentloaded");

        // fill text
        await aiActions.fill("username input field", "standard_user");
        await aiActions.fill("password input field", "secret_sauce");

        // click
        await aiActions.click("login button");
        await page.waitForURL("**/inventory.html");

        // get text
        const title: string = await aiActions.getText("page title header in the top bar");
        expect(title).toContain("Products");

        // click to add an item, then open the cart
        await aiActions.click("add to cart button for Sauce Labs Backpack");
        await aiActions.click("shopping cart link");
        await page.waitForURL("**/cart.html");

        // get attribute / visibility checks
        const cartBadge: string = await aiActions.getText("shopping cart badge with the item count");
        expect(cartBadge).toBe("1");
        expect(await aiActions.isVisible("checkout button")).toBe(true);
    });

    test("search the Playwright docs using high-level AI actions", async ({ page, aiActions }) => {
        test.setTimeout(180_000);
        await page.goto("https://playwright.dev/");
        await page.waitForLoadState("load");

        await aiActions.click("Search button", true);

        const searchText: string = "Get started";
        await aiActions.fill("Search docs input field to add search text", searchText, true);

        expect(await aiActions.getInputValue("Search docs input field to add search text", true)).toBe(searchText);
    });
});
