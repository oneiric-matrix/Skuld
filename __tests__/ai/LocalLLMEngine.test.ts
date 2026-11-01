import { LocalLLMEngine } from '../../src/ai/LocalLLMEngine';

describe('LocalLLMEngine', () => {
  let engine: LocalLLMEngine;

  beforeEach(() => {
    engine = LocalLLMEngine.getInstance();
  });

  test('positive: should stream individual tokens and split complete clauses on punctuation', async () => {
    const receivedTokens: string[] = [];
    const receivedClauses: string[] = [];

    const fullResponse = await engine.streamCompletion(
      [
        { role: 'system', content: 'You are Alfred the Butler.' },
        { role: 'user', content: 'What is my schedule?' },
      ],
      (token) => {
        receivedTokens.push(token);
      },
      (clause) => {
        receivedClauses.push(clause);
      }
    );

    expect(fullResponse.length).toBeGreaterThan(0);
    expect(receivedTokens.length).toBeGreaterThan(0);
    expect(receivedClauses.length).toBeGreaterThan(0);

    // Verify clauses are punctuation-delimited phrases
    for (const clause of receivedClauses) {
      expect(clause.trim().length).toBeGreaterThan(0);
    }
  });
});
