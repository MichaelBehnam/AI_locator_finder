import { test, expect } from "../fixtures";
import { Locator } from "@playwright/test";

test.describe("AI Locator Tests", () => {
    test('ask ai to generate a locator for login and add items to cart', async ({ page, aiHelper }) => {
        test.setTimeout(120_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState('domcontentloaded');

        const usernameInput: Locator = await aiHelper.getLocatorFromAi("username input field");
        await usernameInput.fill("standard_user");

        const passwordInput: Locator = await aiHelper.getLocatorFromAi("password input field");
        await passwordInput.fill("secret_sauce");

        const loginButton: Locator = await aiHelper.getLocatorFromAi("login button");
        await loginButton.click();

        await page.waitForURL("**/inventory.html");
        const inventoryContainer: Locator = await aiHelper.getLocatorFromAi("inventory container or list");
        await expect(inventoryContainer.first()).toBeVisible();

        const addBackpackBtn: Locator = await aiHelper.getLocatorFromAi("add to cart button for Sauce Labs Backpack");
        await addBackpackBtn.click();

        const addBikeLightBtn: Locator = await aiHelper.getLocatorFromAi("add to cart button for Sauce Labs Bike Light");
        await addBikeLightBtn.click();

        const cartLink: Locator = await aiHelper.getLocatorFromAi("shopping cart link");
        await cartLink.click();

        await page.waitForURL("**/cart.html");
        const cartList: Locator = await aiHelper.getLocatorFromAi("cart list container");
        await expect(cartList.first()).toBeVisible();

        const checkout: Locator = await aiHelper.getLocatorFromAi("checkout button");
        await checkout.click();
    });

    test('negative login feedback with incorrect username and password', async ({ page, aiHelper }) => {
        test.setTimeout(90_000);
        await page.goto("https://www.saucedemo.com/");
        await page.waitForLoadState('domcontentloaded');

        const usernameInput: Locator = await aiHelper.getLocatorFromAi("username input field");
        await usernameInput.fill("invalid_user");

        const passwordInput: Locator = await aiHelper.getLocatorFromAi("password input field");
        await passwordInput.fill("invalid_password");

        const loginButton: Locator = await aiHelper.getLocatorFromAi("login button");
        await loginButton.click();

        const errorMessage: Locator = await aiHelper.getLocatorFromAi("error message container or text");
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText("Username and password do not match");
    });
});
