/**
 * Tests for React Native safe logging utilities
 * @jest-environment node
 */

import {
  maskEmail,
  maskPhone,
  maskCoordinates,
  maskName,
  hashUserId,
  safeLogUser,
  safeLogEmployee,
  safeLogLocation,
  safeLogBiometric,
  safeLog,
  safeLogError,
} from '../safeLogging';

describe('Safe Logging Utils - Basic Masking', () => {
  describe('maskEmail', () => {
    test('should mask regular email addresses', () => {
      expect(maskEmail('admin@example.com')).toBe('a***@example.com');
      expect(maskEmail('john.doe@company.org')).toBe('j***@company.org');
      expect(maskEmail('test@domain.co.uk')).toBe('t***@domain.co.uk');
    });

    test('should handle short emails', () => {
      expect(maskEmail('a@test.com')).toBe('*@test.com');
      expect(maskEmail('ab@test.com')).toBe('a***@test.com');
    });

    test('should handle invalid emails', () => {
      expect(maskEmail('')).toBe('[invalid_email]');
      expect(maskEmail('invalid-email')).toBe('[invalid_email]');
      expect(maskEmail('no-at-sign')).toBe('[invalid_email]');
      expect(maskEmail('@domain.com')).toBe('*@domain.com');
    });

    test('should handle null and undefined', () => {
      expect(maskEmail(null)).toBe('[invalid_email]');
      expect(maskEmail(undefined)).toBe('[invalid_email]');
    });
  });

  describe('maskPhone', () => {
    test('should mask international numbers', () => {
      expect(maskPhone('+972501234567')).toBe('***4567');
      expect(maskPhone('+1-234-567-8901')).toBe('***8901');
      expect(maskPhone('1234567890')).toBe('***7890');
    });

    test('should handle numbers with separators', () => {
      expect(maskPhone('+1 (234) 567-8901')).toBe('***8901');
      expect(maskPhone('972-50-123-4567')).toBe('***4567');
    });

    test('should handle short and invalid numbers', () => {
      expect(maskPhone('123')).toBe('***');
      expect(maskPhone('abc')).toBe('***');
      expect(maskPhone('')).toBe('[no_phone]');
    });

    test('should handle null and undefined', () => {
      expect(maskPhone(null)).toBe('[no_phone]');
      expect(maskPhone(undefined)).toBe('[no_phone]');
    });
  });

  describe('maskCoordinates', () => {
    test('should identify office zone (Tel Aviv)', () => {
      expect(maskCoordinates(32.05, 34.78)).toBe('Office Area');
      expect(maskCoordinates(32.051, 34.781)).toBe('Office Area');
      expect(maskCoordinates(32.1, 34.9)).toBe('Office Area');
    });

    test('should identify city zone', () => {
      expect(maskCoordinates(32.5, 34.5)).toBe('City Area');
      expect(maskCoordinates(31.8, 34.2)).toBe('City Area');
      expect(maskCoordinates(33.0, 35.5)).toBe('City Area');
    });

    test('should identify remote locations', () => {
      expect(maskCoordinates(40.7, -74.0)).toBe('Remote Location'); // NYC
      expect(maskCoordinates(51.5, -0.1)).toBe('Remote Location'); // London
      expect(maskCoordinates(0, 0)).toBe('Remote Location');
    });

    test('should handle null and undefined', () => {
      expect(maskCoordinates(null, null)).toBe('Location Unknown');
      expect(maskCoordinates(32.05, null)).toBe('Location Unknown');
      expect(maskCoordinates(null, 34.78)).toBe('Location Unknown');
    });
  });

  describe('maskName', () => {
    test('should mask full names', () => {
      expect(maskName('John Doe')).toBe('J.D.');
      expect(maskName('Sarah Jane Smith')).toBe('S.J.');
      expect(maskName('Mikhail Plotnik')).toBe('M.P.');
    });

    test('should handle single names', () => {
      expect(maskName('Admin')).toBe('A.');
      expect(maskName('John')).toBe('J.');
    });

    test('should handle empty and invalid names', () => {
      expect(maskName('')).toBe('[no_name]');
      expect(maskName('   ')).toBe('[no_name]');
      expect(maskName(null)).toBe('[no_name]');
      expect(maskName(undefined)).toBe('[no_name]');
    });
  });

  describe('hashUserId', () => {
    test('should create identical hashes for identical IDs', () => {
      const hash1 = hashUserId(123);
      const hash2 = hashUserId(123);
      expect(hash1).toBe(hash2);
    });

    test('should create different hashes for different IDs', () => {
      const hash1 = hashUserId(123);
      const hash2 = hashUserId(456);
      expect(hash1).not.toBe(hash2);
    });

    test('should return correct format', () => {
      const hash = hashUserId(123);
      expect(hash).toMatch(/^usr_[a-f0-9]{8}$/);
    });

    test('should handle string IDs', () => {
      expect(hashUserId('123')).toMatch(/^usr_[a-f0-9]{8}$/);
      expect(hashUserId('abc')).toMatch(/^usr_[a-f0-9]{8}$/);
    });

    test('should handle empty values', () => {
      expect(hashUserId(null)).toBe('[no_id]');
      expect(hashUserId(undefined)).toBe('[no_id]');
      expect(hashUserId('')).toBe('[no_id]');
    });
  });
});

describe('Safe Logging Utils - Complex Objects', () => {
  describe('safeLogUser', () => {
    test('should safely log complete user data', () => {
      const user = {
        id: 123,
        email: 'admin@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        is_superuser: true,
      };

      const result = safeLogUser(user, 'login');

      expect(result).toEqual({
        action: 'login',
        user_hash: expect.stringMatching(/^usr_[a-f0-9]{8}$/),
        role: 'admin',
        is_superuser: true,
        email_masked: 'a***@example.com',
        name_initials: 'J.D.',
      });

      // Verify that original data is NOT present
      expect(result.email).toBeUndefined();
      expect(result.first_name).toBeUndefined();
      expect(result.last_name).toBeUndefined();
      expect(result.id).toBeUndefined();
    });

    test('should handle user without name', () => {
      const user = {
        id: 456,
        email: 'user@test.com',
        role: 'employee',
      };

      const result = safeLogUser(user, 'action');

      expect(result.email_masked).toBe('u***@test.com');
      expect(result.name_initials).toBeUndefined();
    });

    test('should handle null user', () => {
      const result = safeLogUser(null, 'anonymous_action');
      expect(result).toEqual({
        action: 'anonymous_action',
        user: 'anonymous',
      });
    });
  });

  describe('safeLogEmployee', () => {
    test('should safely log employee data', () => {
      const employee = {
        id: 789,
        email: 'employee@company.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+972501234567',
        role: 'employee',
        employment_type: 'full_time',
      };

      const result = safeLogEmployee(employee, 'check_in');

      expect(result).toEqual({
        action: 'check_in',
        employee_hash: expect.stringMatching(/^usr_[a-f0-9]{8}$/),
        role: 'employee',
        employment_type: 'full_time',
        email_masked: 'e***@company.com',
        name_initials: 'J.S.',
        phone_masked: '***4567',
      });

      // Verify that original data is NOT present
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.first_name).toBeUndefined();
    });

    test('should handle null employee', () => {
      const result = safeLogEmployee(null, 'no_employee');
      expect(result).toEqual({
        action: 'no_employee',
        employee: 'none',
      });
    });
  });

  describe('safeLogBiometric', () => {
    test('should safely log biometric data', () => {
      const biometricData = {
        hasImage: true,
        confidence: 0.95,
        sessionId: 'session_123',
        base64Data: 'very_long_base64_string...',
        imageSize: 464312,
      };

      const result = safeLogBiometric(biometricData);

      expect(result).toEqual({
        has_image: true,
        confidence_level: 'high',
        session_exists: true,
      });

      // Verify that sensitive data is NOT logged
      expect(result.base64Data).toBeUndefined();
      expect(result.imageSize).toBeUndefined();
      expect(result.sessionId).toBeUndefined();
    });

    test('should handle low confidence', () => {
      const biometricData = { confidence: 0.5 };
      const result = safeLogBiometric(biometricData);
      expect(result.confidence_level).toBe('low');
    });

    test('should handle null data', () => {
      const result = safeLogBiometric(null);
      expect(result).toEqual({ biometric: 'none' });
    });
  });
});

describe('Safe Logging Utils - Detection and Warnings', () => {
  // Mock console methods for testing
  let consoleSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Set __DEV__ to true for tests
    global.__DEV__ = true;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('safeLog PII Detection', () => {
    test('should detect email in data', () => {
      const data = { message: 'User admin@example.com logged in' };
      safeLog('Test message', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL DETECTED]'),
        data
      );
    });

    test('should detect precise coordinates', () => {
      const data = { location: '32.050936, 34.781800' };
      safeLog('Location data', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[COORDINATES DETECTED]'),
        data
      );
    });

    test('should detect phone numbers', () => {
      const data = { contact: '+972501234567' };
      safeLog('Contact info', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PHONE DETECTED]'),
        data
      );
    });

    test('should detect multiple PII types simultaneously', () => {
      const data = {
        user: 'admin@example.com',
        location: '32.050936',
        phone: '+1234567890',
      };
      safeLog('Multiple PII', data);

      const warningCall = consoleWarnSpy.mock.calls[0][0];
      expect(warningCall).toContain('[EMAIL DETECTED]');
      expect(warningCall).toContain('[COORDINATES DETECTED]');
      expect(warningCall).toContain('[PHONE DETECTED]');
    });

    test('should use regular console.log for safe data', () => {
      const data = { location: 'Office Area', user: 'a***@example.com' };
      safeLog('Safe data', data);

      expect(consoleSpy).toHaveBeenCalledWith('Safe data', data);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('safeLogError', () => {
    test('should safely log errors', () => {
      const error = {
        message: 'Network timeout',
        code: 500,
        stack: 'Error stack trace...',
      };

      safeLogError('API Error', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error', {
        message: 'Network timeout',
        code: 500,
        stack: 'Error stack trace...',
      });
    });

    test('should hide stack trace in production', () => {
      global.__DEV__ = false;

      const error = {
        message: 'Database error',
        stack: 'Sensitive stack trace...',
      };

      safeLogError('DB Error', error);

      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError.stack).toBeUndefined();
      expect(loggedError.message).toBe('Database error');
    });
  });
});

describe('Safe Logging Utils - Integration Tests', () => {
  test('should protect real user data', () => {
    // Simulation of real data from application
    const realUserData = {
      id: 4,
      email: 'mikhail.plotnik@gmail.com',
      first_name: 'Mikhail',
      last_name: 'Plotnik',
      role: 'admin',
      is_superuser: true,
    };

    const safeData = safeLogUser(realUserData, 'biometric_check');

    // Verify that no PII leaks
    const serialized = JSON.stringify(safeData);
    expect(serialized).not.toContain('mikhail.plotnik@gmail.com');
    expect(serialized).not.toContain('Mikhail');
    expect(serialized).not.toContain('Plotnik');

    // But basic information is preserved for debugging
    expect(safeData.role).toBe('admin');
    expect(safeData.email_masked).toBe('m***@gmail.com');
    expect(safeData.name_initials).toBe('M.P.');
  });

  test('should protect real application GPS data', () => {
    // Real coordinates from logs
    const realCoords = {
      latitude: 32.050936,
      longitude: 34.7818,
      accuracy: 5,
    };

    const safeLocation = safeLogLocation(realCoords.latitude, realCoords.longitude);

    // Precise coordinates should NOT be present
    expect(safeLocation).not.toContain('32.050936');
    expect(safeLocation).not.toContain('34.781800');

    // Should contain generalized information
    expect(safeLocation).toBe('Office Area');
  });

  test('should work with production biometric data', () => {
    // Simulation of data from real check-in
    const realBiometricData = {
      hasImage: true,
      imageDataLength: 464335,
      base64Length: 464312,
      confidence: 0.95,
      sessionId: 'biometric_session_xyz',
      employeeId: 4,
    };

    const safeBiometric = safeLogBiometric(realBiometricData);

    // Sensitive data should NOT be logged
    const serialized = JSON.stringify(safeBiometric);
    expect(serialized).not.toContain('464335');
    expect(serialized).not.toContain('464312');
    expect(serialized).not.toContain('biometric_session_xyz');

    // Only safe meta-information
    expect(safeBiometric.has_image).toBe(true);
    expect(safeBiometric.confidence_level).toBe('high');
  });
});

describe('Safe Logging Utils - Performance Tests', () => {
  test('maskEmail should be fast for large volumes', () => {
    const emails = Array(1000).fill('test@example.com');

    const start = performance.now();
    emails.forEach(email => maskEmail(email));
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Less than 100ms for 1000 emails
  });

  test('safeLogUser should efficiently handle complex objects', () => {
    const complexUser = {
      id: 123,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      metadata: { lastLogin: '2025-01-01', preferences: {} },
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      safeLogUser(complexUser, 'performance_test');
    }
    const end = performance.now();

    expect(end - start).toBeLessThan(50); // Less than 50ms for 100 operations
  });
});
