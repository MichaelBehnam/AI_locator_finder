import { LMStudioClient } from "@lmstudio/sdk";

/**
 * Asks a question to the local AI using the LM Studio SDK.
 * Assumes the LM Studio server is running on localhost port 1234.
 *
 * @param question The text question to ask the AI.
 * @param modelName The specific model identifier to use. You must pass the name
 *                  of the model you have loaded in LM Studio.
 * @returns The parsed text response from the AI.
 */
export async function askQuestion(question: string, modelName: string): Promise<string> {
    // Initialize the LM Studio client to point to localhost on port 1234
    const client = new LMStudioClient({
        baseUrl: "ws://127.0.0.1:1234"
    });

    try {
        // Load or connect to the specified model
        const model = await client.llm.model(modelName);

        // Send the prompt and wait for the response
        const result = await model.respond(question);

        // Parse and return the response as text
        return result.content;
    } catch (error) {
        console.error("Error asking question via LM Studio SDK:", error);
        throw error;
    }
}
