import { test, expect } from "@playwright/test";
import { getLocatorFromAi } from "../aiHelper";

test('ask ai to generate a locator', async ({ page }) => {
    await page.goto("https://www.saucedemo.com/");
    await page.waitForLoadState('domcontentloaded');
    
    // Get username input field using AI helper and fill it
    const usernameInput = await getLocatorFromAi(page, "username input field");
    await usernameInput.fill("standard_user");
    
    // Get password input field using AI helper and fill it
    const passwordInput = await getLocatorFromAi(page, "password input field");
    await passwordInput.fill("secret_sauce");
    
    // Get login button using AI helper and click it
    const loginButton = await getLocatorFromAi(page, "login button");
    await loginButton.click();
    
    // Verify that we successfully logged in by checking the URL or page content
    await page.waitForURL("**/inventory.html");
    const inventoryContainer = await getLocatorFromAi(page, "inventory container or list");
    await expect(inventoryContainer).toBeVisible();
});
