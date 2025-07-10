/**
 * Утилиты для безопасного логирования в React Native приложении
 * Автоматически маскирует PII данные перед выводом в логи
 */

/**
 * Маскирует email адрес для безопасного логирования
 * @param {string} email - Email для маскирования
 * @returns {string} Маскированный email (a***@example.com)
 */
export const maskEmail = (email) => {
  if (!email || !email.includes('@')) {
    return '[invalid_email]';
  }
  
  const [username, domain] = email.split('@');
  if (username.length <= 1) {
    return `*@${domain}`;
  }
  
  return `${username[0]}***@${domain}`;
};

/**
 * Маскирует номер телефона для безопасного логирования
 * @param {string} phone - Номер телефона
 * @returns {string} Маскированный номер (***4567)
 */
export const maskPhone = (phone) => {
  if (!phone) {
    return '[no_phone]';
  }
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***';
  }
  
  return `***${digits.slice(-4)}`;
};

/**
 * Маскирует GPS координаты для безопасного логирования
 * @param {number} lat - Широта
 * @param {number} lng - Долгота
 * @returns {string} Обобщённое местоположение
 */
export const maskCoordinates = (lat, lng) => {
  if (lat == null || lng == null) {
    return 'Location Unknown';
  }
  
  // Определяем зону по координатам (примерно для Израиля/Тель-Авива)
  if (lat >= 32.0 && lat <= 32.1 && lng >= 34.7 && lng <= 34.9) {
    return 'Office Area';
  } else if (lat >= 31.5 && lat <= 33.0 && lng >= 34.0 && lng <= 35.5) {
    return 'City Area';
  } else {
    return 'Remote Location';
  }
};

/**
 * Маскирует полное имя для безопасного логирования
 * @param {string} fullName - Полное имя
 * @returns {string} Инициалы (M.P.)
 */
export const maskName = (fullName) => {
  if (!fullName || !fullName.trim()) {
    return '[no_name]';
  }
  
  const parts = fullName.trim().split(' ').filter(part => part.length > 0);
  if (parts.length === 1) {
    return `${parts[0][0]}.`;
  } else if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[1][0]}.`;
  }
  
  return '[no_name]';
};

/**
 * Создаёт хэш от user ID для безопасного логирования
 * @param {number|string} userId - ID пользователя
 * @returns {string} Хэшированный ID
 */
export const hashUserId = (userId) => {
  if (!userId) {
    return '[no_id]';
  }
  
  // Простое хэширование для клиентской стороны
  const str = `myhours_2025:${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `usr_${Math.abs(hash).toString(16).substring(0, 8)}`;
};

/**
 * Создаёт безопасный объект пользователя для логирования
 * @param {Object} user - Объект пользователя
 * @param {string} action - Описание действия
 * @returns {Object} Безопасные данные пользователя
 */
export const safeLogUser = (user, action = 'action') => {
  if (!user) {
    return { action, user: 'anonymous' };
  }
  
  const safeData = {
    action,
    user_hash: hashUserId(user.id),
    role: user.role || 'unknown',
    is_superuser: user.is_superuser || false
  };
  
  if (user.email) {
    safeData.email_masked = maskEmail(user.email);
  }
  
  if (user.first_name || user.last_name) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) {
      safeData.name_initials = maskName(fullName);
    }
  }
  
  return safeData;
};

/**
 * Создаёт безопасный объект сотрудника для логирования
 * @param {Object} employee - Объект сотрудника
 * @param {string} action - Описание действия
 * @returns {Object} Безопасные данные сотрудника
 */
export const safeLogEmployee = (employee, action = 'action') => {
  if (!employee) {
    return { action, employee: 'none' };
  }
  
  const safeData = {
    action,
    employee_hash: hashUserId(employee.id),
    role: employee.role || 'unknown',
    employment_type: employee.employment_type || 'unknown'
  };
  
  if (employee.email) {
    safeData.email_masked = maskEmail(employee.email);
  }
  
  if (employee.first_name || employee.last_name) {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    if (fullName) {
      safeData.name_initials = maskName(fullName);
    }
  }
  
  if (employee.phone) {
    safeData.phone_masked = maskPhone(employee.phone);
  }
  
  return safeData;
};

/**
 * Создаёт безопасное представление местоположения
 * @param {number} lat - Широта
 * @param {number} lng - Долгота
 * @returns {string} Обобщённое местоположение
 */
export const safeLogLocation = (lat, lng) => {
  return maskCoordinates(lat, lng);
};

/**
 * Маскирует биометрические данные
 * @param {Object} biometricData - Данные биометрии
 * @returns {Object} Безопасные данные биометрии
 */
export const safeLogBiometric = (biometricData) => {
  if (!biometricData) {
    return { biometric: 'none' };
  }
  
  const safe = {};
  
  if (biometricData.hasImage !== undefined) {
    safe.has_image = biometricData.hasImage;
  }
  
  if (biometricData.confidence !== undefined) {
    safe.confidence_level = biometricData.confidence > 0.8 ? 'high' : 'low';
  }
  
  if (biometricData.sessionId) {
    safe.session_exists = true;
  }
  
  // НЕ логируем: base64 данные, точные размеры, хэши
  return safe;
};

/**
 * Безопасный wrapper для console.log с автоматическим обнаружением PII
 * @param {string} message - Сообщение для логирования
 * @param {Object} data - Данные для логирования
 */
export const safeLog = (message, data = {}) => {
  // В development режиме проверяем на потенциальные PII
  if (__DEV__) {
    const dataStr = JSON.stringify(data);
    
    // Простые паттерны для обнаружения PII
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const coordPattern = /\b\d{1,3}\.\d{4,}\b/; // Точные координаты
    const phonePattern = /\+?\d{7,}/; // Телефонные номера
    
    let warning = '';
    if (emailPattern.test(dataStr)) {
      warning += '[⚠️ EMAIL DETECTED] ';
    }
    if (coordPattern.test(dataStr)) {
      warning += '[⚠️ COORDINATES DETECTED] ';
    }
    if (phonePattern.test(dataStr)) {
      warning += '[⚠️ PHONE DETECTED] ';
    }
    
    if (warning) {
      console.warn(`${warning}${message}`, data);
    } else {
      console.log(message, data);
    }
  } else {
    // В production ничего не логируем для безопасности
    // или используем специальный production logger
  }
};

/**
 * Безопасный wrapper для console.error
 * @param {string} message - Сообщение об ошибке
 * @param {Object} error - Объект ошибки
 */
export const safeLogError = (message, error = {}) => {
  const safeError = {
    message: error.message || 'Unknown error',
    code: error.code || error.status || 'unknown',
    // НЕ логируем stack trace в production
    ...((__DEV__ && error.stack) ? { stack: error.stack } : {})
  };
  
  console.error(message, safeError);
};

// Примеры использования:
/*
// Вместо:
console.log('✅ User data loaded:', userData.email);

// Используйте:
safeLog('✅ User data loaded:', safeLogUser(userData, 'data_loaded'));

// Вместо:
console.log('📍 Location obtained:', {
  lat: currentLocation.coords.latitude.toFixed(6),
  lng: currentLocation.coords.longitude.toFixed(6)
});

// Используйте:
safeLog('📍 Location obtained:', {
  location: safeLogLocation(
    currentLocation.coords.latitude,
    currentLocation.coords.longitude
  ),
  accuracy: currentLocation.coords.accuracy
});

// Вместо:
console.log('Creating employee:', employeeData);

// Используйте:
safeLog('Creating employee:', safeLogEmployee(employeeData, 'creation'));
*/