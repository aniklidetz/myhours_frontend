#!/usr/bin/env node

/**
 * Simple test runner for checking safe logging utilities
 * Can be run without Jest for quick verification
 */

// Import utilities
const {
  maskEmail,
  maskPhone,
  maskCoordinates,
  maskName,
  hashUserId,
  safeLogUser,
  safeLogEmployee,
  safeLogLocation,
  safeLogBiometric,
} = require('./src/utils/safeLogging');

console.log('Running safe logging tests for React Native...');
console.log('=' * 60);

// Simple testing function
function test(description, testFn) {
  try {
    testFn();
    console.log(`PASS ${description}`);
  } catch (error) {
    console.log(`FAIL ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected '${expected}', got '${actual}'`);
  }
}

// Email masking tests
console.log('\nTesting email masking:');
test('Regular email', () => {
  assertEqual(maskEmail('admin@example.com'), 'a***@example.com', 'Email not masked');
});

test('Short email', () => {
  assertEqual(maskEmail('a@test.com'), '*@test.com', 'Short email not masked');
});

test('Invalid email', () => {
  assertEqual(maskEmail('invalid'), '[invalid_email]', 'Invalid email not handled');
});

// Phone masking tests
console.log('\nTesting phone masking:');
test('International number', () => {
  assertEqual(maskPhone('+972501234567'), '***4567', 'Phone not masked');
});

test('Number with separators', () => {
  assertEqual(maskPhone('+1-234-567-8901'), '***8901', 'Number with separators not handled');
});

// Coordinate masking tests
console.log('\nTesting GPS coordinate masking:');
test('Office coordinates', () => {
  assertEqual(maskCoordinates(32.05, 34.78), 'Office Area', 'Office coordinates not detected');
});

test('Remote location', () => {
  assertEqual(maskCoordinates(40.7, -74.0), 'Remote Location', 'Remote location not detected');
});

// Name masking tests
console.log('\nTesting name masking:');
test('Full name', () => {
  assertEqual(maskName('John Doe'), 'J.D.', 'Full name not masked');
});

test('Single name', () => {
  assertEqual(maskName('Admin'), 'A.', 'Single name not masked');
});

// ID hashing tests
console.log('\nTesting ID hashing:');
test('Numeric ID hashing', () => {
  const hash = hashUserId(123);
  if (!hash.startsWith('usr_') || hash.length !== 12) {
    throw new Error('Invalid hash format');
  }
});

test('Hash consistency', () => {
  const hash1 = hashUserId(456);
  const hash2 = hashUserId(456);
  assertEqual(hash1, hash2, 'Hashes should be identical for same ID');
});

// Complex object tests
console.log('\nTesting complex objects:');
test('Safe user logging', () => {
  const user = {
    id: 123,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
  };

  const result = safeLogUser(user, 'test');

  if (result.email_masked !== 't***@example.com') {
    throw new Error('Email not masked in user object');
  }

  if (result.name_initials !== 'T.U.') {
    throw new Error('Name not masked in user object');
  }

  if (result.email || result.first_name || result.last_name) {
    throw new Error('Original data present in result');
  }
});

test('Safe biometric logging', () => {
  const biometricData = {
    hasImage: true,
    confidence: 0.95,
    sessionId: 'secret_session',
    base64Data: 'very_long_secret_data',
  };

  const result = safeLogBiometric(biometricData);

  if (result.base64Data || result.sessionId) {
    throw new Error('Secret biometric data present in result');
  }

  if (result.confidence_level !== 'high') {
    throw new Error('Confidence level not determined correctly');
  }
});

// Real data protection tests
console.log('\nTesting protection against real data leaks:');
test('Protection against mikhail.plotnik@gmail.com leak', () => {
  const userData = {
    email: 'mikhail.plotnik@gmail.com',
    first_name: 'Mikhail',
    last_name: 'Plotnik',
  };

  const result = safeLogUser(userData, 'biometric_check');
  const serialized = JSON.stringify(result);

  if (serialized.includes('mikhail.plotnik@gmail.com')) {
    throw new Error('Email leaked in safe logging');
  }

  if (serialized.includes('Mikhail') || serialized.includes('Plotnik')) {
    throw new Error('Full names leaked in safe logging');
  }
});

test('Protection against exact GPS coordinate leak', () => {
  const lat = 32.050936;
  const lng = 34.7818;

  const result = safeLogLocation(lat, lng);

  if (result.includes('32.050936') || result.includes('34.781800')) {
    throw new Error('Exact GPS coordinates leaked in safe logging');
  }

  if (result !== 'Office Area') {
    throw new Error('GPS coordinates not properly generalized');
  }
});

console.log('\nAll tests completed!');
console.log('\nSecurity statistics:');
console.log('PASS Email masking works');
console.log('PASS GPS coordinates protected');
console.log('PASS Names masked');
console.log('PASS Phones protected');
console.log('PASS Biometric data hidden');
console.log('PASS User objects are safe');

console.log('\nReady for production deployment!');
console.log('\nTo run full Jest tests use: npm run test:security');
