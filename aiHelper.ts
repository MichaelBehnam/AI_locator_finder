import { LMStudioClient } from "@lmstudio/sdk";

/**
 * Asks a question to the local AI using the LM Studio SDK.
 * Assumes the LM Studio server is running on localhost port 1234.
 *
 * @param question The text question to ask the AI.
 * @returns The parsed text response from the AI.
 */
export interface AIResponseDTO {
    response: string;
    incomingTokens: number;
    outgoingTokens: number;
}

export async function askQuestion(question: string): Promise<AIResponseDTO> {
    const modelName = 'google/gemma-4-e4b';
    // Initialize the LM Studio client to point to localhost on port 1234
    const client = new LMStudioClient({
        baseUrl: "ws://127.0.0.1:1234"
    });

    try {
        // Load or connect to the specified model
        const model = await client.llm.model(modelName);

        // Send the prompt and wait for the response
        const result = await model.respond(question);

        // Return the DTO
        return {
            response: result.content,
            incomingTokens: result.stats.promptTokensCount,
            outgoingTokens: result.stats.predictedTokensCount
        };
    } catch (error) {
        console.error("Error asking question via LM Studio SDK:", error);
        throw error;
    }
}
