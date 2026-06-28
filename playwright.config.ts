import {defineConfig, devices} from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.resolve(__dirname, '.env'), quiet: true});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    globalSetup: require.resolve('./global-setup'),
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests to avoid overloading local LLM. */
    workers: 1,
    reporter: [['html', {open: 'never'}]],
    use: {

        /* Maximum time each action (click, fill, etc.) can take. Kept generous to
           account for AI-located actions resolving selectors at runtime. */
        actionTimeout: 5_000,
        navigationTimeout: 30_000,

        trace: 'on',
        headless: false,
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: {width: 1920, height: 937},
                launchOptions: {
                    chromiumSandbox: true
                }
            },

        }
    ]

});
