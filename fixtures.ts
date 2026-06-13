import { test as base, expect, Locator } from "@playwright/test";
import { getLocatorFromAi } from "./aiHelper";

// Define the fixture type
export type MyFixtures = {
    aiLocator: (description: string) => Promise<Locator>;
};

// Extend base test to include our new fixture
export const test = base.extend<MyFixtures>({
    aiLocator: async ({ page }, use) => {
        const boundGetLocator = (description: string) => getLocatorFromAi(page, description);
        await use(boundGetLocator);
    },
});

export { expect };
