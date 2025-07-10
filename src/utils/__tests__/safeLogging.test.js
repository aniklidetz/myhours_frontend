/**
 * Тесты для утилит безопасного логирования React Native
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
  safeLogError
} from '../safeLogging';

describe('Safe Logging Utils - Basic Masking', () => {
  describe('maskEmail', () => {
    test('должен маскировать обычные email адреса', () => {
      expect(maskEmail('admin@example.com')).toBe('a***@example.com');
      expect(maskEmail('john.doe@company.org')).toBe('j***@company.org');
      expect(maskEmail('test@domain.co.uk')).toBe('t***@domain.co.uk');
    });

    test('должен обрабатывать короткие email', () => {
      expect(maskEmail('a@test.com')).toBe('*@test.com');
      expect(maskEmail('ab@test.com')).toBe('a***@test.com');
    });

    test('должен обрабатывать некорректные email', () => {
      expect(maskEmail('')).toBe('[invalid_email]');
      expect(maskEmail('invalid-email')).toBe('[invalid_email]');
      expect(maskEmail('no-at-sign')).toBe('[invalid_email]');
      expect(maskEmail('@domain.com')).toBe('*@domain.com');
    });

    test('должен обрабатывать null и undefined', () => {
      expect(maskEmail(null)).toBe('[invalid_email]');
      expect(maskEmail(undefined)).toBe('[invalid_email]');
    });
  });

  describe('maskPhone', () => {
    test('должен маскировать международные номера', () => {
      expect(maskPhone('+972501234567')).toBe('***4567');
      expect(maskPhone('+1-234-567-8901')).toBe('***8901');
      expect(maskPhone('1234567890')).toBe('***7890');
    });

    test('должен обрабатывать номера с разделителями', () => {
      expect(maskPhone('+1 (234) 567-8901')).toBe('***8901');
      expect(maskPhone('972-50-123-4567')).toBe('***4567');
    });

    test('должен обрабатывать короткие и некорректные номера', () => {
      expect(maskPhone('123')).toBe('***');
      expect(maskPhone('abc')).toBe('***');
      expect(maskPhone('')).toBe('[no_phone]');
    });

    test('должен обрабатывать null и undefined', () => {
      expect(maskPhone(null)).toBe('[no_phone]');
      expect(maskPhone(undefined)).toBe('[no_phone]');
    });
  });

  describe('maskCoordinates', () => {
    test('должен определять офисную зону (Тель-Авив)', () => {
      expect(maskCoordinates(32.05, 34.78)).toBe('Office Area');
      expect(maskCoordinates(32.051, 34.781)).toBe('Office Area');
      expect(maskCoordinates(32.1, 34.9)).toBe('Office Area');
    });

    test('должен определять городскую зону', () => {
      expect(maskCoordinates(32.5, 34.5)).toBe('City Area');
      expect(maskCoordinates(31.8, 34.2)).toBe('City Area');
      expect(maskCoordinates(33.0, 35.5)).toBe('City Area');
    });

    test('должен определять удалённые локации', () => {
      expect(maskCoordinates(40.7, -74.0)).toBe('Remote Location'); // NYC
      expect(maskCoordinates(51.5, -0.1)).toBe('Remote Location'); // London
      expect(maskCoordinates(0, 0)).toBe('Remote Location');
    });

    test('должен обрабатывать null и undefined', () => {
      expect(maskCoordinates(null, null)).toBe('Location Unknown');
      expect(maskCoordinates(32.05, null)).toBe('Location Unknown');
      expect(maskCoordinates(null, 34.78)).toBe('Location Unknown');
    });
  });

  describe('maskName', () => {
    test('должен маскировать полные имена', () => {
      expect(maskName('John Doe')).toBe('J.D.');
      expect(maskName('Sarah Jane Smith')).toBe('S.J.');
      expect(maskName('Mikhail Plotnik')).toBe('M.P.');
    });

    test('должен обрабатывать одиночные имена', () => {
      expect(maskName('Admin')).toBe('A.');
      expect(maskName('John')).toBe('J.');
    });

    test('должен обрабатывать пустые и некорректные имена', () => {
      expect(maskName('')).toBe('[no_name]');
      expect(maskName('   ')).toBe('[no_name]');
      expect(maskName(null)).toBe('[no_name]');
      expect(maskName(undefined)).toBe('[no_name]');
    });
  });

  describe('hashUserId', () => {
    test('должен создавать одинаковые хэши для одинаковых ID', () => {
      const hash1 = hashUserId(123);
      const hash2 = hashUserId(123);
      expect(hash1).toBe(hash2);
    });

    test('должен создавать разные хэши для разных ID', () => {
      const hash1 = hashUserId(123);
      const hash2 = hashUserId(456);
      expect(hash1).not.toBe(hash2);
    });

    test('должен возвращать правильный формат', () => {
      const hash = hashUserId(123);
      expect(hash).toMatch(/^usr_[a-f0-9]{8}$/);
    });

    test('должен обрабатывать строковые ID', () => {
      expect(hashUserId('123')).toMatch(/^usr_[a-f0-9]{8}$/);
      expect(hashUserId('abc')).toMatch(/^usr_[a-f0-9]{8}$/);
    });

    test('должен обрабатывать пустые значения', () => {
      expect(hashUserId(null)).toBe('[no_id]');
      expect(hashUserId(undefined)).toBe('[no_id]');
      expect(hashUserId('')).toBe('[no_id]');
    });
  });
});

describe('Safe Logging Utils - Complex Objects', () => {
  describe('safeLogUser', () => {
    test('должен безопасно логировать полные данные пользователя', () => {
      const user = {
        id: 123,
        email: 'admin@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        is_superuser: true
      };

      const result = safeLogUser(user, 'login');

      expect(result).toEqual({
        action: 'login',
        user_hash: expect.stringMatching(/^usr_[a-f0-9]{8}$/),
        role: 'admin',
        is_superuser: true,
        email_masked: 'a***@example.com',
        name_initials: 'J.D.'
      });

      // Проверяем, что оригинальные данные НЕ присутствуют
      expect(result.email).toBeUndefined();
      expect(result.first_name).toBeUndefined();
      expect(result.last_name).toBeUndefined();
      expect(result.id).toBeUndefined();
    });

    test('должен обрабатывать пользователя без имени', () => {
      const user = {
        id: 456,
        email: 'user@test.com',
        role: 'employee'
      };

      const result = safeLogUser(user, 'action');

      expect(result.email_masked).toBe('u***@test.com');
      expect(result.name_initials).toBeUndefined();
    });

    test('должен обрабатывать null пользователя', () => {
      const result = safeLogUser(null, 'anonymous_action');
      expect(result).toEqual({
        action: 'anonymous_action',
        user: 'anonymous'
      });
    });
  });

  describe('safeLogEmployee', () => {
    test('должен безопасно логировать данные сотрудника', () => {
      const employee = {
        id: 789,
        email: 'employee@company.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+972501234567',
        role: 'employee',
        employment_type: 'full_time'
      };

      const result = safeLogEmployee(employee, 'check_in');

      expect(result).toEqual({
        action: 'check_in',
        employee_hash: expect.stringMatching(/^usr_[a-f0-9]{8}$/),
        role: 'employee',
        employment_type: 'full_time',
        email_masked: 'e***@company.com',
        name_initials: 'J.S.',
        phone_masked: '***4567'
      });

      // Проверяем отсутствие оригинальных данных
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.first_name).toBeUndefined();
    });

    test('должен обрабатывать null сотрудника', () => {
      const result = safeLogEmployee(null, 'no_employee');
      expect(result).toEqual({
        action: 'no_employee',
        employee: 'none'
      });
    });
  });

  describe('safeLogBiometric', () => {
    test('должен безопасно логировать биометрические данные', () => {
      const biometricData = {
        hasImage: true,
        confidence: 0.95,
        sessionId: 'session_123',
        base64Data: 'very_long_base64_string...',
        imageSize: 464312
      };

      const result = safeLogBiometric(biometricData);

      expect(result).toEqual({
        has_image: true,
        confidence_level: 'high',
        session_exists: true
      });

      // Проверяем, что чувствительные данные НЕ логируются
      expect(result.base64Data).toBeUndefined();
      expect(result.imageSize).toBeUndefined();
      expect(result.sessionId).toBeUndefined();
    });

    test('должен обрабатывать низкую уверенность', () => {
      const biometricData = { confidence: 0.5 };
      const result = safeLogBiometric(biometricData);
      expect(result.confidence_level).toBe('low');
    });

    test('должен обрабатывать null данные', () => {
      const result = safeLogBiometric(null);
      expect(result).toEqual({ biometric: 'none' });
    });
  });
});

describe('Safe Logging Utils - Detection and Warnings', () => {
  // Mock console methods для тестирования
  let consoleSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Устанавливаем __DEV__ в true для тестов
    global.__DEV__ = true;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('safeLog PII Detection', () => {
    test('должен обнаруживать email в данных', () => {
      const data = { message: 'User admin@example.com logged in' };
      safeLog('Test message', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[⚠️ EMAIL DETECTED]'),
        data
      );
    });

    test('должен обнаруживать точные координаты', () => {
      const data = { location: '32.050936, 34.781800' };
      safeLog('Location data', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[⚠️ COORDINATES DETECTED]'),
        data
      );
    });

    test('должен обнаруживать номера телефонов', () => {
      const data = { contact: '+972501234567' };
      safeLog('Contact info', data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[⚠️ PHONE DETECTED]'),
        data
      );
    });

    test('должен обнаруживать несколько типов PII одновременно', () => {
      const data = { 
        user: 'admin@example.com',
        location: '32.050936',
        phone: '+1234567890'
      };
      safeLog('Multiple PII', data);

      const warningCall = consoleWarnSpy.mock.calls[0][0];
      expect(warningCall).toContain('[⚠️ EMAIL DETECTED]');
      expect(warningCall).toContain('[⚠️ COORDINATES DETECTED]');
      expect(warningCall).toContain('[⚠️ PHONE DETECTED]');
    });

    test('должен использовать обычный console.log для безопасных данных', () => {
      const data = { location: 'Office Area', user: 'a***@example.com' };
      safeLog('Safe data', data);

      expect(consoleSpy).toHaveBeenCalledWith('Safe data', data);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('safeLogError', () => {
    test('должен безопасно логировать ошибки', () => {
      const error = {
        message: 'Network timeout',
        code: 500,
        stack: 'Error stack trace...'
      };

      safeLogError('API Error', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error', {
        message: 'Network timeout',
        code: 500,
        stack: 'Error stack trace...'
      });
    });

    test('должен скрывать stack trace в production', () => {
      global.__DEV__ = false;

      const error = {
        message: 'Database error',
        stack: 'Sensitive stack trace...'
      };

      safeLogError('DB Error', error);

      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError.stack).toBeUndefined();
      expect(loggedError.message).toBe('Database error');
    });
  });
});

describe('Safe Logging Utils - Integration Tests', () => {
  test('должен защищать реальные пользовательские данные', () => {
    // Симуляция реальных данных из приложения
    const realUserData = {
      id: 4,
      email: 'mikhail.plotnik@gmail.com',
      first_name: 'Mikhail',
      last_name: 'Plotnik',
      role: 'admin',
      is_superuser: true
    };

    const safeData = safeLogUser(realUserData, 'biometric_check');

    // Проверяем, что никакие PII не утекают
    const serialized = JSON.stringify(safeData);
    expect(serialized).not.toContain('mikhail.plotnik@gmail.com');
    expect(serialized).not.toContain('Mikhail');
    expect(serialized).not.toContain('Plotnik');
    
    // Но базовая информация сохраняется для отладки
    expect(safeData.role).toBe('admin');
    expect(safeData.email_masked).toBe('m***@gmail.com');
    expect(safeData.name_initials).toBe('M.P.');
  });

  test('должен защищать GPS данные реального приложения', () => {
    // Реальные координаты из логов
    const realCoords = {
      latitude: 32.050936,
      longitude: 34.781800,
      accuracy: 5
    };

    const safeLocation = safeLogLocation(realCoords.latitude, realCoords.longitude);

    // Точные координаты НЕ должны присутствовать
    expect(safeLocation).not.toContain('32.050936');
    expect(safeLocation).not.toContain('34.781800');
    
    // Должна быть обобщённая информация
    expect(safeLocation).toBe('Office Area');
  });

  test('должен работать с производственными биометрическими данными', () => {
    // Симуляция данных из реального check-in
    const realBiometricData = {
      hasImage: true,
      imageDataLength: 464335,
      base64Length: 464312,
      confidence: 0.95,
      sessionId: 'biometric_session_xyz',
      employeeId: 4
    };

    const safeBiometric = safeLogBiometric(realBiometricData);

    // Чувствительные данные НЕ должны логироваться
    const serialized = JSON.stringify(safeBiometric);
    expect(serialized).not.toContain('464335');
    expect(serialized).not.toContain('464312');
    expect(serialized).not.toContain('biometric_session_xyz');
    
    // Только безопасная метаинформация
    expect(safeBiometric.has_image).toBe(true);
    expect(safeBiometric.confidence_level).toBe('high');
  });
});

describe('Safe Logging Utils - Performance Tests', () => {
  test('maskEmail должен быть быстрым для больших объёмов', () => {
    const emails = Array(1000).fill('test@example.com');
    
    const start = performance.now();
    emails.forEach(email => maskEmail(email));
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100); // Менее 100ms для 1000 email
  });

  test('safeLogUser должен эффективно обрабатывать сложные объекты', () => {
    const complexUser = {
      id: 123,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      metadata: { lastLogin: '2025-01-01', preferences: {} }
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      safeLogUser(complexUser, 'performance_test');
    }
    const end = performance.now();
    
    expect(end - start).toBeLessThan(50); // Менее 50ms для 100 операций
  });
});