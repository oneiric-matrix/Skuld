import { SkuldEnvelopeCodec, EncryptedEnvelope } from '../../src/security/SkuldEnvelope';
import * as Crypto from 'expo-crypto';

// Mock expo-crypto for Node testing environment
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (byteCount: number) => {
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
      bytes[i] = (i * 17 + 42) & 0xff;
    }
    return bytes;
  }),
  digestStringAsync: jest.fn(async (_algorithm: any, str: string) => {
    // Simple deterministic hash mock for testing
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

describe('SkuldEnvelopeCodec', () => {
  const sampleKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    sampleKey[i] = i + 1;
  }

  test('positive: should seal and unseal arbitrary JSON payload correctly', async () => {
    const originalPayload = {
      userGoal: 'Learn Rust and manage monthly groceries',
      budgetLimit: 450,
      medications: ['Vitamin D', 'Omega 3'],
      nested: { active: true },
    };

    const envelope = await SkuldEnvelopeCodec.seal(originalPayload, sampleKey);

    expect(envelope.magic).toBe('SKLD');
    expect(envelope.format).toBe('skuld-v1');
    expect(envelope.ciphertextHex).toBeDefined();
    expect(envelope.ivHex).toBeDefined();
    expect(envelope.checksumHex).toBeDefined();

    const decrypted = await SkuldEnvelopeCodec.unseal<typeof originalPayload>(envelope, sampleKey);
    expect(decrypted).toEqual(originalPayload);
  });

  test('negative: should reject envelope if magic header is invalid', async () => {
    const envelope = await SkuldEnvelopeCodec.seal({ test: 123 }, sampleKey);
    const corruptedEnvelope: EncryptedEnvelope = {
      ...envelope,
      magic: 'BADM',
    };

    await expect(SkuldEnvelopeCodec.unseal(corruptedEnvelope, sampleKey)).rejects.toThrow(
      'Invalid or corrupted .skuld envelope header'
    );
  });

  test('negative: should detect tampering and reject payload if ciphertext is modified', async () => {
    const envelope = await SkuldEnvelopeCodec.seal({ secret: 'classified' }, sampleKey);
    // Tamper with ciphertext by altering characters
    const tamperedCiphertext =
      envelope.ciphertextHex.slice(0, -2) + (envelope.ciphertextHex.slice(-2) === 'aa' ? 'bb' : 'aa');

    const tamperedEnvelope: EncryptedEnvelope = {
      ...envelope,
      ciphertextHex: tamperedCiphertext,
    };

    await expect(SkuldEnvelopeCodec.unseal(tamperedEnvelope, sampleKey)).rejects.toThrow(
      'Tamper verification failed'
    );
  });

  test('negative: should fail or produce corrupted data if wrong key is used', async () => {
    const envelope = await SkuldEnvelopeCodec.seal({ notes: 'personal journal' }, sampleKey);
    const wrongKey = new Uint8Array(32).fill(99);

    // Unsealing with wrong key causes JSON parse error or checksum integrity failure
    await expect(SkuldEnvelopeCodec.unseal(envelope, wrongKey)).rejects.toThrow();
  });
});
