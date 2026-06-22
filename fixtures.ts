import { test as base, expect } from "@playwright/test";
import { AIHelper } from "./aiHelper";
import { AIActions } from "./aiActions";

export type MyFixtures = {
    aiHelper: AIHelper;
    aiActions: AIActions;
};

export const test = base.extend<MyFixtures>({
    aiHelper: async ({ page }, use) => {
        await use(new AIHelper(page));
    },
    aiActions: async ({ aiHelper }, use) => {
        await use(new AIActions(aiHelper));
    },
});

export { expect };
