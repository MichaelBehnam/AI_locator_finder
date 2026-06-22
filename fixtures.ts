import { test as base, expect } from "@playwright/test";
import { AIHelper } from "./aiHelper";

export type MyFixtures = {
    aiHelper: AIHelper;
};

export const test = base.extend<MyFixtures>({
    aiHelper: async ({ page }, use) => {
        await use(new AIHelper(page));
    },
});

export { expect };
