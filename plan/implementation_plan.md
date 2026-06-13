# Add AI Helper to Generate Playwright Locator from Page HTML

Add a new helper function `getLocatorFromAi(page, description)` in `aiHelper.ts`. This function extracts the HTML of the current Playwright page, constructs a prompt for the LM Studio model, and queries the model to find the best CSS or XPath selector for the described element. It then cleans the response and returns a Playwright `Locator`.

## Proposed Changes

### AI Locator Module

#### [MODIFY] [aiHelper.ts](file:///d:/dev/AI/AI_locator/aiHelper.ts)
- Import `Page` and `Locator` from `@playwright/test`.
- Implement `getLocatorFromAi(page: Page, description: string): Promise<Locator>`.
- Extract page HTML using `await page.content()`.
- Define a system/user prompt instructing the AI model to return ONLY the raw selector string (e.g. CSS or XPath selector) for the element matching `description`.
- Strip any markdown, backticks, or quotes from the AI's response.
- Return the locator using `page.locator(cleanedSelector)`.

#### [MODIFY] [locatorFromAi.spec.ts](file:///d:/dev/AI/AI_locator/tests/locatorFromAi.spec.ts)
- Update the test file to navigate to a target website (e.g., `https://www.saucedemo.com/`).
- Use the new `getLocatorFromAi` helper to find the "Username" input field and fill it, the "Password" input field and fill it, and the "Login" button and click it.
- Verify successful login or form validation/error response to ensure the locators found by the AI were correct and functional.

## Verification Plan

### Automated Tests
We will execute the Playwright tests to verify the functionality:
- `npx playwright test tests/locatorFromAi.spec.ts`
- `npx playwright test tests/aiHelper.spec.ts`

### Manual Verification
- We will monitor the console output of the test execution to ensure LM Studio successfully generates the CSS/XPath selector and Playwright uses it correctly.
