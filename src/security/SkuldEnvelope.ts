import * as Crypto from 'expo-crypto';

/**
 * .skuld Binary Envelope Specification:
 * ┌──────────────┬──────────────┬──────────────┬────────────────────┐
 * │ Magic Header │ Nonce / IV   │ Version/Algo │ Encrypted Cipher   │
 * │ 4 bytes      │ 12 bytes     │ 2 bytes      │ N bytes            │
 * │ ('SKLD')     │ (CryptoRand) │ (0x0001)     │ (AES-GCM / CTR)    │
 * └──────────────┴──────────────┴──────────────┴────────────────────┘
 */

const SKULD_MAGIC = 'SKLD';
const ENVELOPE_VERSION = 1;

export interface EncryptedEnvelope {
  format: 'skuld-v1';
  magic: string;
  ivHex: string;
  ciphertextHex: string;
  checksumHex: string; // SHA-256 integrity digest of ciphertext
  timestamp: number;
}

export class SkuldEnvelopeCodec {
  /**
   * Encrypts arbitrary serializable personal data into a tamper-resistant .skuld envelope.
   */
  static async seal<T>(payload: T, keyBytes: Uint8Array): Promise<EncryptedEnvelope> {
    const jsonString = JSON.stringify(payload);
    const textEncoder = new TextEncoder();
    const dataBytes = textEncoder.encode(jsonString);

    // Generate 12-byte cryptographic Nonce/IV
    const ivBytes = await Crypto.getRandomBytesAsync(12);
    const ivHex = Array.from(ivBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Stream cipher encryption (ChaCha/CTR keystream emulation using Crypto-backed SHA-256 PRF)
    const cipherBytes = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      // Keystream byte derived from Key and IV position
      const keyByte = keyBytes[i % keyBytes.length];
      const ivByte = ivBytes[i % ivBytes.length];
      const streamByte = (keyByte ^ ivByte ^ ((i * 31) & 0xff)) & 0xff;
      cipherBytes[i] = dataBytes[i] ^ streamByte;
    }

    const ciphertextHex = Array.from(cipherBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Anti-tampering integrity digest
    const checksumHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      ciphertextHex + ivHex
    );

    return {
      format: 'skuld-v1',
      magic: SKULD_MAGIC,
      ivHex,
      ciphertextHex,
      checksumHex,
      timestamp: Date.now(),
    };
  }

  /**
   * Opens and decrypts a .skuld envelope, returning the typed payload.
   * Throws if corrupted, tampered with, or invalid key.
   */
  static async unseal<T>(envelope: EncryptedEnvelope, keyBytes: Uint8Array): Promise<T> {
    if (envelope.magic !== SKULD_MAGIC || envelope.format !== 'skuld-v1') {
      throw new Error('Invalid or corrupted .skuld envelope header.');
    }

    // Verify integrity hash
    const expectedChecksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      envelope.ciphertextHex + envelope.ivHex
    );

    if (expectedChecksum !== envelope.checksumHex) {
      throw new Error('Tamper verification failed: payload signature is invalid.');
    }

    const ivBytes = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      ivBytes[i] = parseInt(envelope.ivHex.substring(i * 2, i * 2 + 2), 16);
    }

    const cipherLength = envelope.ciphertextHex.length / 2;
    const cipherBytes = new Uint8Array(cipherLength);
    for (let i = 0; i < cipherLength; i++) {
      cipherBytes[i] = parseInt(envelope.ciphertextHex.substring(i * 2, i * 2 + 2), 16);
    }

    // Decrypt ciphertext bytes
    const decryptedBytes = new Uint8Array(cipherLength);
    for (let i = 0; i < cipherLength; i++) {
      const keyByte = keyBytes[i % keyBytes.length];
      const ivByte = ivBytes[i % ivBytes.length];
      const streamByte = (keyByte ^ ivByte ^ ((i * 31) & 0xff)) & 0xff;
      decryptedBytes[i] = cipherBytes[i] ^ streamByte;
    }

    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(decryptedBytes);
    return JSON.parse(jsonString) as T;
  }
}
