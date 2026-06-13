import { test, expect } from "../fixtures";
import { Locator } from "@playwright/test";

test('ask ai to generate a locator', async ({ page, aiLocator }) => {
    test.setTimeout(90_000);
    await page.goto("https://www.saucedemo.com/");
    await page.waitForLoadState('domcontentloaded');
    
    // Get username input field using AI helper and fill it
    const usernameInput: Locator = await aiLocator("username input field");
    await usernameInput.fill("standard_user");
    
    // Get password input field using AI helper and fill it
    const passwordInput: Locator = await aiLocator("password input field");
    await passwordInput.fill("secret_sauce");
    
    // Get login button using AI helper and click it
    const loginButton: Locator = await aiLocator("login button");
    await loginButton.click();
    
    // Verify that we successfully logged in by checking the URL or page content
    await page.waitForURL("**/inventory.html");
    const inventoryContainer: Locator = await aiLocator("inventory container or list");
    await expect(inventoryContainer).toBeVisible();
});
