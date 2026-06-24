# Playwright AI Locator

A lightweight integration tool that leverages a local LLM running in **LM Studio** to dynamically generate Playwright Locators based on HTML content and natural language descriptions of target elements.

> [!IMPORTANT]
> This project is designed to work **specifically and only with LM Studio** as it utilizes the official `@lmstudio/sdk` to communicate with the local model.

---

## Core building blocks

| Class | File | Responsibility |
| --- | --- | --- |
| [`AIHelper`](./aiHelper.ts) | `aiHelper.ts` | Talks to the LM Studio model, builds the prompt, and resolves a natural-language description into a Playwright `Locator`. |
| [`AIActions`](./aiActions.ts) | `aiActions.ts` | High-level wrapper around `AIHelper` that resolves a description **and** performs a Playwright action (click, fill, getText, …) in a single call. |
| [`AISmartActions`](./aiSmartActions.ts) | `aiSmartActions.ts` | Top-level wrapper that **infers which action** a free-form instruction implies (click? fill? read?), then dispatches to the matching `AIActions` method. |

---

## What is `getLocatorFromAi`?

The `getLocatorFromAi` method is the core of this project. It lives on the [`AIHelper`](./aiHelper.ts) class and is an asynchronous helper designed to dynamically find and return a Playwright `Locator` for a page element.

### Signature
```typescript
declare class AIHelper {
    constructor(page: Page);
    getLocatorFromAi(description: string, withImage?: boolean): Promise<Locator>;
}
```

The `page` is bound once when the helper is constructed. Pass `withImage: true` to also send a screenshot of the page to a vision-capable model for extra context.

### How it works:
1. **HTML Capture**: It retrieves the complete page HTML content using `page.content()`.
2. **Optional Screenshot**: When `withImage` is `true`, it captures a full-page JPEG screenshot and attaches it to the prompt.
3. **Contextual Reference**: It attempts to load reference guidelines from [skills/get-xpath.md](./skills/get-xpath.md) (such as XPath cheatsheet methods) to inject into the LLM prompt for higher accuracy.
4. **Prompt Generation**: It constructs a prompt instructing the LLM to identify the target element described by the `description` string, strictly returning only the CSS or XPath selector.
5. **LM Studio Querying**: It queries the local AI model running inside **LM Studio** using the `@lmstudio/sdk`.
6. **Response Cleaning**: It cleans up the AI response by stripping out markdown syntax, thought/channel tags, outer quotes, and extra whitespace, keeping only the raw selector.
7. **Locator Resolution & Retry**: It instantiates a Playwright `Locator` via `page.locator(selector)` and verifies it matches at least one element. If not, it retries (up to `MAX_ATTEMPTS`) before throwing.

---

## High-level actions: `AIActions`

[`AIActions`](./aiActions.ts) wraps an `AIHelper` instance so you can resolve an element **and** act on it in one call, e.g. `await aiActions.click("login button")`.

Every method accepts a human description of the target element. Most also accept an optional `withImage` flag (send a screenshot to the model) and an optional `timeout` (ms) that is forwarded to the underlying Playwright call:

```typescript
await aiActions.click("login button");               // basic
await aiActions.click("login button", true);          // also send a screenshot
await aiActions.click("login button", false, 10_000); // custom 10s timeout
```

### Available methods

| Method | Description |
| --- | --- |
| `locate(description, withImage?)` | Return the underlying `Locator` (escape hatch for actions not covered below). |
| `click(description, withImage?, timeout?)` | Click the element. |
| `doubleClick(description, withImage?, timeout?)` | Double-click the element. |
| `fill(description, value, withImage?, timeout?)` | Fill an editable element with text. |
| `type(description, value, withImage?, timeout?)` | Type text character by character. |
| `clear(description, withImage?, timeout?)` | Clear an editable element. |
| `getText(description, withImage?, timeout?)` | Return the visible inner text. |
| `getTextContent(description, withImage?, timeout?)` | Return the raw `textContent` (may be `null`). |
| `getAttribute(description, attribute, withImage?, timeout?)` | Return an attribute value (`null` if absent). |
| `getInputValue(description, withImage?, timeout?)` | Return the `value` of an input/textarea/select. |
| `check(description, withImage?, timeout?)` | Check a checkbox or radio. |
| `uncheck(description, withImage?, timeout?)` | Uncheck a checkbox. |
| `selectOption(description, values, withImage?, timeout?)` | Select option(s) in a `<select>`. |
| `hover(description, withImage?, timeout?)` | Hover over the element. |
| `press(description, key, withImage?, timeout?)` | Focus the element and press a key, e.g. `"Enter"`. |
| `isVisible(description, withImage?, timeout?)` | Whether the element is visible. |
| `isChecked(description, withImage?, timeout?)` | Whether a checkbox/radio is checked. |

---

## Inferred actions: `AISmartActions`

[`AISmartActions`](./aiSmartActions.ts) sits one level above [`AIActions`](./aiActions.ts). Instead of *you* naming the action, the AI **infers** which action a free-form instruction implies, extracts the target element and any value it needs, then calls the matching `AIActions` method for you.

```typescript
await smart.perform("enter standard_user into the username field"); // -> aiActions.fill(...)
await smart.perform("click the login button");                       // -> aiActions.click(...)
const title = await smart.perform("read the page title");            // -> aiActions.getText(...)
const ok    = await smart.perform("is the cart link visible");       // -> aiActions.isVisible(...)
```

Under the hood, `perform` first asks the model to classify the instruction into a structured [`AIActionIntentDTO`](./aiActionIntent.dto.ts) — `{ action, target, value? }` — then routes that intent to the right `AIActions` call. The result is whatever the underlying action returns (`void`, `string`, `boolean`, …).

### Methods

| Method | Description |
| --- | --- |
| `perform(instruction, withImage?, timeout?)` | Infer the action from the instruction and execute it. Returns the underlying action's result. |
| `performAll(instructions, withImage?, timeout?)` | Run a list of instructions in order, returning each step's result. |
| `resolveIntent(instruction)` | Classify the instruction into an `AIActionIntentDTO` **without** executing it (handy for assertions/debugging). |

The inferred `action` is one of the same verbs `AIActions` exposes: `click`, `doubleClick`, `fill`, `type`, `clear`, `getText`, `getAttribute`, `getInputValue`, `check`, `uncheck`, `selectOption`, `hover`, `press`, `isVisible`, `isChecked`, `waitFor`. For `fill`/`type` the model also returns the text, for `selectOption` the option, for `press` the key, and for `getAttribute` the attribute name.

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

The recommended entry point is the custom Playwright fixture defined in [fixtures.ts](./fixtures.ts), which exposes two fixtures bound to the current `page`:

- `aiHelper` — an [`AIHelper`](./aiHelper.ts) instance (low-level: returns `Locator`s).
- `aiActions` — an [`AIActions`](./aiActions.ts) instance (high-level: resolves and acts).

### 1. Using `aiActions` (high-level)

Snippet from [tests/aiActions.spec.ts](./tests/aiActions.spec.ts):

```typescript
import { test, expect } from "../fixtures";

test("login using high-level AI actions", async ({ page, aiActions }) => {
    await page.goto("https://www.saucedemo.com/");
    await page.waitForLoadState("domcontentloaded");

    await aiActions.fill("username input field", "standard_user");
    await aiActions.fill("password input field", "secret_sauce");
    await aiActions.click("login button");
    await page.waitForURL("**/inventory.html");

    const title: string = await aiActions.getText("page title header in the top bar");
    expect(title).toContain("Products");
});
```

### 2. Using `aiHelper` (low-level `Locator`s)

Snippet from [tests/locatorFromAi.spec.ts](./tests/locatorFromAi.spec.ts):

```typescript
import { test, expect } from "../fixtures";
import { Locator } from "@playwright/test";

test("ask ai to generate a locator", async ({ page, aiHelper }) => {
    await page.goto("https://www.saucedemo.com/");
    await page.waitForLoadState('domcontentloaded');

    // Get username input field using AI helper and fill it
    const usernameInput: Locator = await aiHelper.getLocatorFromAi("username input field");
    await usernameInput.fill("standard_user");

    // Get password input field using AI helper and fill it
    const passwordInput: Locator = await aiHelper.getLocatorFromAi("password input field");
    await passwordInput.fill("secret_sauce");

    // Get login button using AI helper and click it
    const loginButton: Locator = await aiHelper.getLocatorFromAi("login button");
    await loginButton.click();
});
```

### 3. Constructing the helpers manually

If you are not using the fixture, construct them directly:

```typescript
import { test } from "@playwright/test";
import { AIHelper } from "./aiHelper";
import { AIActions } from "./aiActions";

test("manual construction", async ({ page }) => {
    const aiHelper = new AIHelper(page);
    const aiActions = new AIActions(aiHelper);

    await page.goto("https://example.com");
    await aiActions.click("the main login submit button");
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
