import {test as base, expect} from "@playwright/test";
import {AIHelper} from "./aiHelper";
import {AIActions} from "./aiActions";
import {AISmartActions} from "./aiSmartActions";
import {AIConnection} from "./aiConnection";

export type MyFixtures = {
    aiHelper: AIHelper;
    aiActions: AIActions;
    aiSmartActions: AISmartActions;
};

export type MyWorkerFixtures = {
    aiConnection: AIConnection;
};

export const test = base.extend<MyFixtures, MyWorkerFixtures>({
    // Worker-scoped: establish the single LM Studio connection once (lazily, the
    // first time an AI fixture is used in this worker) and disconnect it once,
    // after all tests in the worker have finished.
    aiConnection: [async ({}, use) => {
        const connection: AIConnection = AIConnection.getInstance();
        await use(connection);
        await AIConnection.disconnect();
    }, {scope: "worker"}],

    aiHelper: async ({aiConnection, page}, use) => {
        // Depend on `aiConnection` only to tie this helper's lifetime to the
        // shared connection; AIHelper itself pulls the client from the singleton.
        void aiConnection;
        await use(new AIHelper(page));
    },
    aiActions: async ({aiHelper}, use) => {
        await use(new AIActions(aiHelper));
    },
    aiSmartActions: async ({aiHelper, aiActions}, use) => {
        await use(new AISmartActions(aiHelper, aiActions));
    },
});

export {expect};
