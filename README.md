# Playwright AI Locator

A lightweight integration tool that leverages a local LLM running in **LM Studio** to dynamically generate Playwright Locators based on HTML content and natural language descriptions of target elements.

> [!IMPORTANT]
> This project is designed to work **specifically and only with LM Studio** as it utilizes the official `@lmstudio/sdk` to communicate with the local model.

---

## What is `getLocatorFromAi`?

The `getLocatorFromAi` function is the core of this project. Located in [aiHelper.ts](./aiHelper.ts), it is an asynchronous helper function designed to dynamically find and return a Playwright `Locator` for a page element.

### Signature
```typescript
export async function getLocatorFromAi(page: Page, description: string): Promise<Locator>
```

### How it works:
1. **HTML Capture**: It retrieves the complete page HTML content using `page.content()`.
2. **Contextual Reference**: It attempts to load reference guidelines from [skills/get-xpath.md](./skills/get-xpath.md) (such as XPath cheatsheet methods) to inject into the LLM prompt for higher accuracy.
3. **Prompt Generation**: It constructs a prompt instructing the LLM to identify the target element described by the `description` string. It instructs the LLM to strictly return only the CSS selector or XPath selector.
4. **LM Studio Querying**: It queries the local AI model running inside **LM Studio** using the `@lmstudio/sdk`.
5. **Response Cleaning**: It cleans up the AI response by stripping out markdown syntax, thought/channel tags, outer quotes, and extra whitespace, keeping only the raw selector.
6. **Locator Resolution**: It instantiates and returns a Playwright `Locator` using `page.locator(selector)`.

---

## Configuration & Environment Variables

To run the AI Helper, you need to configure your environment variables. You must create your own `.env` file in the root directory.

### `.env` File Fields

Create a file named `.env` in the root of the project and populate it with the following fields:

```env
# The identifier of the model loaded in LM Studio
MODEL_NAME=google/gemma-4-e4b

# The IP address where your LM Studio local server is running
AI_IP=127.0.0.1

# The port where your LM Studio local server is running
AI_PORT=1234

# The maximum number of attempts to find a locator before failing
MAX_ATTEMPTS=5
```

> [!NOTE]
> Each variable falls back to a built-in default if it is missing, empty, or invalid: `MODEL_NAME=google/gemma-4-e4b`, `AI_IP=127.0.0.1`, `AI_PORT=1234`, and `MAX_ATTEMPTS=5`.

---

## Usage Examples

### 1. Direct Usage of `getLocatorFromAi`

```typescript
import { test } from '@playwright/test';
import { getLocatorFromAi } from './aiHelper';

test('Direct AI Locator example', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Dynamically retrieve the locator for a button
    const submitBtn = await getLocatorFromAi(page, 'the main login submit button');
    await submitBtn.click();
});
```

### 2. Using the Custom Playwright Fixture

You can use the custom fixture defined in [fixtures.ts](./fixtures.ts), which binds the page object automatically to the helper as `aiLocator`.

Here is a snippet from [locatorFromAi.spec.ts](./tests/locatorFromAi.spec.ts):

```typescript
import { test, expect } from "../fixtures";
import { Locator } from "@playwright/test";

test("ask ai to generate a locator", async ({ page, aiLocator }) => {
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
});
```

---

## Running the Tests

To test the integration and verify everything works correctly:

1. Launch **LM Studio** and ensure the model specified in your `.env` is loaded and running.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Execute the tests:
   ```bash
   npm test
   ```
