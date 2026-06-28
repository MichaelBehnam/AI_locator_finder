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

/**
 * Third-party ad / analytics hosts that demoqa (and similar sites) pull in.
 * In headed runs these inject tens of thousands of tokens of ad DOM into the
 * page, which then gets serialized into the locator prompt and blows past the
 * model's context window ("n_keep >= n_ctx"). Blocking the requests keeps the
 * DOM lean (and the tests faster and more deterministic).
 */
const BLOCKED_RESOURCE_HOSTS: RegExp =
    /(googlesyndication|doubleclick|googletagmanager|google-analytics|googleadservices|adservice\.google|pagead2|fundingchoicesmessages|amazon-adsystem|adsafeprotected|adnxs|moatads|scorecardresearch|quantserve)\./i;

export const test = base.extend<MyFixtures, MyWorkerFixtures>({
    // Block ad/analytics traffic before any navigation so the page DOM stays small
    // enough to fit the model's context window. See {@link BLOCKED_RESOURCE_HOSTS}.
    page: async ({page}, use) => {
        await page.route("**/*", (route) => {
            if (BLOCKED_RESOURCE_HOSTS.test(route.request().url())) {
                return route.abort();
            }
            return route.continue();
        });
        await use(page);
    },

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
