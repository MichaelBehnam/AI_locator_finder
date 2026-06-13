import { test, expect } from '@playwright/test';
import { askQuestion } from '../aiHelper';
import { AIResponseDTO } from '../aiResponse.dto';

test.describe('AI Helper', () => {
  // NOTE: This test requires LM Studio to be running on localhost:1234.
  // You will need to replace 'your-loaded-model-id' with the actual model identifier
  // that is currently loaded in your LM Studio instance.
  test('should ask a question and return a text response', async () => {
    
    const question: string = 'Please reply with exactly the words: "Hello, World!"';

    try {
      const result: AIResponseDTO = await askQuestion(question);
      
      console.log('AI Response:', result);
      
      // Basic assertions to ensure we got a valid response back
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(typeof result.incomingTokens).toBe('number');
      expect(typeof result.outgoingTokens).toBe('number');
      
    } catch (error: unknown) {
      console.error(
        'Failed to connect to LM Studio. Ensure it is running on port 1234 and the model is loaded.',
        error
      );
      // Re-throw to ensure the test fails if it cannot connect
      throw error;
    }
  });
});
