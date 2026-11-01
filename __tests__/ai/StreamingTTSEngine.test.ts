import { StreamingTTSEngine, VisemeFrame } from '../../src/ai/StreamingTTSEngine';

describe('StreamingTTSEngine', () => {
  let engine: StreamingTTSEngine;

  beforeEach(() => {
    engine = StreamingTTSEngine.getInstance();
    engine.stopSpeaking();
  });

  test('positive: should correctly register viseme listener and emit frames', async () => {
    const receivedFrames: VisemeFrame[] = [];
    const unsubscribe = engine.addVisemeListener((frame) => {
      receivedFrames.push(frame);
    });

    await engine.speakClause('Hello world', {
      modelId: 'en_US-amy-medium',
      speed: 2.0, // fast speed for quick test
      pitch: 1.0,
    });

    expect(receivedFrames.length).toBeGreaterThan(0);
    expect(receivedFrames[receivedFrames.length - 1].mouthShape).toBe('closed');
    expect(receivedFrames[receivedFrames.length - 1].amplitude).toBe(0);

    unsubscribe();
  });

  test('positive: should stop speaking and clear speech queue upon stopSpeaking()', () => {
    engine.stopSpeaking();
    expect(engine.getIsSpeaking()).toBe(false);
  });
});
