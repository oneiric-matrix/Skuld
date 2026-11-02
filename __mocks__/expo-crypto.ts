export const getRandomBytesAsync = jest.fn(async (byteCount: number) => {
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = (i * 17 + 42) & 0xff;
  }
  return bytes;
});

export const digestStringAsync = jest.fn(async (_algorithm: any, str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
});

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
};
