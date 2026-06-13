import { test, expect } from '@playwright/test';
import { askQuestion } from '../aiHelper';

test.describe('AI Helper', () => {
  // NOTE: This test requires LM Studio to be running on localhost:1234.
  // You will need to replace 'your-loaded-model-id' with the actual model identifier
  // that is currently loaded in your LM Studio instance.
  test('should ask a question and return a text response', async () => {
    
    const question = 'Please reply with exactly the words: "Hello, World!"';

    try {
      const response = await askQuestion(question);
      
      console.log('AI Response:', response);
      
      // Basic assertions to ensure we got a valid text response back
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error(
        'Failed to connect to LM Studio. Ensure it is running on port 1234 and the model is loaded.',
        error
      );
      // Re-throw to ensure the test fails if it cannot connect
      throw error;
    }
  });
});
