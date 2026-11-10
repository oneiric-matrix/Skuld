export const openDatabaseAsync = jest.fn(async () => ({
  execAsync: jest.fn(async () => {}),
  runAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async () => null),
  getAllAsync: jest.fn(async () => []),
}));
