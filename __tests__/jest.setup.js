// __tests__/setup.js
// Jest setup file for mocking native modules

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo with proper implementation
const netInfoListeners = [];
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback) => {
    netInfoListeners.push(callback);
    return jest.fn(); // Return unsubscribe function
  }),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));

// Mock Alert - set to undefined so service skips it
global.Alert = undefined;

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
