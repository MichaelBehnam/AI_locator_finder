import { test as base, expect } from "@playwright/test";
import { AIHelper } from "./aiHelper";
import { AIActions } from "./aiActions";
import { AISmartActions } from "./aiSmartActions";

export type MyFixtures = {
    aiHelper: AIHelper;
    aiActions: AIActions;
    aiSmartActions: AISmartActions;
};

export const test = base.extend<MyFixtures>({
    aiHelper: async ({ page }, use) => {
        await use(new AIHelper(page));
    },
    aiActions: async ({ aiHelper }, use) => {
        await use(new AIActions(aiHelper));
    },
    aiSmartActions: async ({ aiHelper, aiActions }, use) => {
        await use(new AISmartActions(aiHelper, aiActions));
    },
});

export { expect };
