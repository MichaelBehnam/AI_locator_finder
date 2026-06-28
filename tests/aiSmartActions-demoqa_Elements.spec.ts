import {test, expect} from "../fixtures";
import {AIActionIntentDTO} from "../aiActionIntent.dto";

/**
 * AI Smart Actions exercised against the demoqa "Elements" section
 * (https://demoqa.com/elements).
 *
 * The emphasis is on {@link AISmartActions.resolveIntent}: for each page we let
 * the model classify a batch of free-form instructions into the right
 * action/target/value WITHOUT executing them, then run a small `perform`/
 * `performAll` flow on the most robust widgets to prove the inferred intents
 * actually drive the page.
 */

// LM-Studio round trips are slow; every test issues several of them.
const PAGE_TIMEOUT = 520_000;

test.describe("AI Smart Actions - demoqa Elements", () => {

    // Shared per-test setup: every test issues several slow LM-Studio round trips.
    // The page-specific navigation stays in each test since the URL differs.
    test.setTimeout(PAGE_TIMEOUT);

    test("Text Box: infers fill/click intents and submits the form", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/text-box");

        // --- intent classification only (no execution) ---
        const fullNameIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("enter John Doe into the Full Name field");
        expect(fullNameIntent.action).toBe("fill");
        expect(fullNameIntent.value).toBe("John Doe");

        const clearIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("clear the Permanent Address field");
        expect(clearIntent.action).toBe("clear");

        const readValueIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("get the current value of the Email input");
        expect(readValueIntent.action).toBe("getInputValue");

        const submitIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the Submit button");
        expect(submitIntent.action).toBe("click");

        // --- execution: fill the whole form and read back the rendered output ---
        await aiSmartActions.performAll([
            "enter John Doe into the Full Name field",
            "enter john.doe@example.com into the Email field",
            "enter 123 Main Street into the Current Address textarea",
            "enter 456 Oak Avenue into the Permanent Address textarea",
            "click the Submit button"
        ]);

        const nameLine: unknown =
            await aiSmartActions.perform("read the Name line shown in the output box below the form");
        expect(typeof nameLine).toBe("string");
        expect(nameLine as string).toContain("John Doe");

        const emailLine: unknown =
            await aiSmartActions.perform("read the Email line shown in the output box below the form");
        expect(emailLine as string).toContain("john.doe@example.com");
    });

    test("Check Box: classifies check/uncheck/isChecked intents", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/checkbox");

        const expandIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the toggle arrow to expand the Home node");
        expect(expandIntent.action).toBe("click");

        const checkIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("check the Home checkbox");
        expect(checkIntent.action).toBe("check");

        const uncheckIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("uncheck the Home checkbox");
        expect(uncheckIntent.action).toBe("uncheck");

        const isCheckedIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("is the Home checkbox checked");
        expect(isCheckedIntent.action).toBe("isChecked");

        // // Execution: expanding the tree is a plain click and is reliable.
        // await aiSmartActions.perform("click the expand-all toggle button");
        // await expect(page.getByText("Desktop", {exact: true})).toBeVisible();
    });

    test("Radio Button: infers the check intent and selects an option", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/radio-button");

        const yesIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("check the Yes radio button");
        expect(yesIntent.action).toBe("check");

        const readSelectionIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("read the success text that says which option was selected");
        expect(readSelectionIntent.action).toBe("getText");

        // Execution: the visible label is what toggles the (hidden) radio input.
        await aiSmartActions.perform("click the Impressive label");
        const selection: unknown =
            await aiSmartActions.perform("read the success message that shows the selected option");
        expect(selection as string).toContain("Impressive");
    });

    test("Buttons: infers click/doubleClick intents and reads the result messages", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/buttons");

        const dblIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("double click the Double Click Me button");
        expect(dblIntent.action).toBe("doubleClick");

        const clickIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the Click Me button");
        expect(clickIntent.action).toBe("click");

        // Execution: double click and confirm the message it produces.
        await aiSmartActions.perform("double click the Double Click Me button");
        const dblMessage: unknown =
            await aiSmartActions.perform("read the double click confirmation message");
        expect(dblMessage as string).toContain("double click");

        await aiSmartActions.perform("click the Click Me button");
        const clickMessage: unknown =
            await aiSmartActions.perform("read the dynamic click confirmation message");
        expect(clickMessage as string).toContain("dynamic click");
    });

    test("Web Tables: classifies add/search/edit/select intents and searches the grid",
        async ({page, aiSmartActions}) => {
            await page.goto("https://demoqa.com/webtables");

            const addIntent: AIActionIntentDTO =
                await aiSmartActions.resolveIntent("click the Add button to open the registration form");
            expect(addIntent.action).toBe("click");

            const searchIntent: AIActionIntentDTO =
                await aiSmartActions.resolveIntent("enter Vega into the search box");
            expect(searchIntent.action).toBe("fill");
            expect(searchIntent.value).toBe("Vega");

            const pressIntent: AIActionIntentDTO =
                await aiSmartActions.resolveIntent("press Enter in the search box");
            expect(pressIntent.action).toBe("press");
            expect(pressIntent.value).toBe("Enter");

            const selectIntent: AIActionIntentDTO =
                await aiSmartActions.resolveIntent("select Show 20 in the rows-per-page dropdown");
            expect(selectIntent.action).toBe("selectOption");
            expect(selectIntent.value).toBeTruthy();

            // Execution: typing in the search box filters the table to one row.
            await aiSmartActions.perform("enter Cierra into the search box");
            await expect(page.getByRole("cell", {name: "Vega"})).toBeVisible();
            await expect(page.getByRole("cell", {name: "Cantrell"})).toHaveCount(0);
        });

    test("Web Tables: adds a new record through the registration form", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/webtables");

        await aiSmartActions.perform("click the Add button to open the registration form");
        await aiSmartActions.performAll([
            "enter Alice into the First Name field",
            "enter Walker into the Last Name field",
            "enter alice.walker@example.com into the Email field",
            "enter 30 into the Age field",
            "enter 50000 into the Salary field",
            "enter Engineering into the Department field"
        ]);
        await aiSmartActions.perform("click the Submit button in the registration form");

        // The new record should now be a row in the table.
        await expect(page.getByRole("cell", {name: "alice.walker@example.com"})).toBeVisible();
    });

    test("Links: classifies click/getAttribute intents and reads an href", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/links");

        const clickIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the Home link that opens a new tab");
        expect(clickIntent.action).toBe("click");

        const hrefIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("get the href attribute of the Home link");
        expect(hrefIntent.action).toBe("getAttribute");
        expect(hrefIntent.value).toBe("href");

        // Execution: read the link's href without navigating.
        const href: unknown =
            await aiSmartActions.perform("get the href attribute of the Home link that opens a new tab");
        expect(href as string).toContain("demoqa.com");
    });

    test("Upload and Download: classifies upload/click intents", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/upload-download");

        const downloadIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the Download button");
        expect(downloadIntent.action).toBe("click");

        const visibleIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("is the Choose File upload button visible");
        expect(visibleIntent.action).toBe("isVisible");

        // Execution: the upload control is visible on load.
        const chooseVisible: unknown =
            await aiSmartActions.perform("is the Choose File upload button visible");
        expect(chooseVisible).toBe(true);
    });

    test("Dynamic Properties: classifies waitFor/hover/isVisible intents", async ({page, aiSmartActions}) => {
        await page.goto("https://demoqa.com/dynamic-properties");

        const waitIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("wait for the button that enables after 5 seconds to be visible");
        expect(waitIntent.action).toBe("waitFor");
        expect(waitIntent.value).toBe("visible");

        const hoverIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("hover over the Color Change button");
        expect(hoverIntent.action).toBe("hover");

        const colorClickIntent: AIActionIntentDTO =
            await aiSmartActions.resolveIntent("click the Color Change button");
        expect(colorClickIntent.action).toBe("click");

        // Execution: the Color Change button is present from the start.
        const colorVisible: unknown =
            await aiSmartActions.perform("is the Color Change button visible");
        expect(colorVisible).toBe(true);
    });
});
