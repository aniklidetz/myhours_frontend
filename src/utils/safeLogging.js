/**
 * Utilities for safe logging in React Native application
 * Automatically masks PII data before outputting to logs
 */

/**
 * Masks email address for safe logging
 * @param {string} email - Email to mask
 * @returns {string} Masked email (a***@example.com)
 */
export const maskEmail = email => {
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
 * Masks phone number for safe logging
 * @param {string} phone - Phone number
 * @returns {string} Masked number (***4567)
 */
export const maskPhone = phone => {
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
 * Masks GPS coordinates for safe logging
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Generalized location
 */
export const maskCoordinates = (lat, lng) => {
  if (lat == null || lng == null) {
    return 'Location Unknown';
  }

  // Determine zone by coordinates (approximately for Israel/Tel Aviv)
  if (lat >= 32.0 && lat <= 32.1 && lng >= 34.7 && lng <= 34.9) {
    return 'Office Area';
  } else if (lat >= 31.5 && lat <= 33.0 && lng >= 34.0 && lng <= 35.5) {
    return 'City Area';
  } else {
    return 'Remote Location';
  }
};

/**
 * Masks full name for safe logging
 * @param {string} fullName - Full name
 * @returns {string} Initials (M.P.)
 */
export const maskName = fullName => {
  if (!fullName || !fullName.trim()) {
    return '[no_name]';
  }

  const parts = fullName
    .trim()
    .split(' ')
    .filter(part => part.length > 0);
  if (parts.length === 1) {
    return `${parts[0][0]}.`;
  } else if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[1][0]}.`;
  }

  return '[no_name]';
};

/**
 * Creates hash from user ID for safe logging
 * @param {number|string} userId - User ID
 * @returns {string} Hashed ID
 */
export const hashUserId = userId => {
  if (!userId) {
    return '[no_id]';
  }

  // Simple hashing for client side
  const str = `myhours_2025:${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `usr_${Math.abs(hash).toString(16).substring(0, 8)}`;
};

/**
 * Creates safe user object for logging
 * @param {Object} user - User object
 * @param {string} action - Action description
 * @returns {Object} Safe user data
 */
export const safeLogUser = (user, action = 'action') => {
  if (!user) {
    return { action, user: 'anonymous' };
  }

  const safeData = {
    action,
    user_hash: hashUserId(user.id),
    role: user.role || 'unknown',
    is_superuser: user.is_superuser || false,
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
 * Creates safe employee object for logging
 * @param {Object} employee - Employee object
 * @param {string} action - Action description
 * @returns {Object} Safe employee data
 */
export const safeLogEmployee = (employee, action = 'action') => {
  if (!employee) {
    return { action, employee: 'none' };
  }

  const safeData = {
    action,
    employee_hash: hashUserId(employee.id),
    role: employee.role || 'unknown',
    employment_type: employee.employment_type || 'unknown',
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
 * Creates safe location representation
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Generalized location
 */
export const safeLogLocation = (lat, lng) => {
  return maskCoordinates(lat, lng);
};

/**
 * Masks biometric data
 * @param {Object} biometricData - Biometric data
 * @returns {Object} Safe biometric data
 */
export const safeLogBiometric = biometricData => {
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

  // DO NOT log: base64 data, exact sizes, hashes
  return safe;
};

/**
 * Safe wrapper for console.log with automatic PII detection
 * @param {string} message - Message for logging
 * @param {Object} data - Data for logging
 */
export const safeLog = (message, data = {}) => {
  // In development mode check for potential PII
  if (__DEV__) {
    const dataStr = JSON.stringify(data);

    // Simple patterns for PII detection
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const coordPattern = /\b\d{1,3}\.\d{4,}\b/; // Exact coordinates
    const phonePattern = /\+?\d{7,}/; // Phone numbers

    let warning = '';
    if (emailPattern.test(dataStr)) {
      warning += '[EMAIL DETECTED] ';
    }
    if (coordPattern.test(dataStr)) {
      warning += '[COORDINATES DETECTED] ';
    }
    if (phonePattern.test(dataStr)) {
      warning += '[PHONE DETECTED] ';
    }

    if (warning) {
      console.warn(`${warning}${message}`, data);
    } else {
      console.log(message, data);
    }
  } else {
    // In production log nothing for security
    // or use special production logger
  }
};

/**
 * Creates safe representation of payroll data for logging
 * @param {Object|Array} payrollData - Payroll data (single object or array)
 * @param {string} action - Action description
 * @returns {Object} Safe data for logging
 */
export const safeLogPayroll = (payrollData, action = 'payroll_action') => {
  if (!payrollData) {
    return { action, status: 'no_data' };
  }

  const isArray = Array.isArray(payrollData);
  const data = isArray ? payrollData : [payrollData];

  const safeData = {
    action,
    employee_count: data.length,
    has_data: data.length > 0,
  };

  if (data.length > 0) {
    const firstEmployee = data[0];

    // Safe metadata (without sums and personal data)
    safeData.calculation_types = [...new Set(data.map(d => d.calculation_type || 'unknown'))];
    safeData.period = firstEmployee.period || 'unknown';
    safeData.has_enhanced_breakdown = !!firstEmployee.enhanced_breakdown;
    safeData.statuses = [...new Set(data.map(d => d.status || 'unknown'))];

    // Aggregated statistics (without exact sums)
    const totalHours = data.reduce((sum, d) => sum + (d.total_hours || d.hoursWorked || 0), 0);
    safeData.total_hours_range =
      totalHours > 0 ? (totalHours < 50 ? 'low' : totalHours < 200 ? 'medium' : 'high') : 'none';

    const hasOvertimes = data.some(d => (d.overtime_hours || d.overtime || 0) > 0);
    safeData.has_overtime_data = hasOvertimes;

    // DO NOT log: exact sums, hourly rates, names, email
  }

  return safeData;
};

/**
 * Creates safe representation of work logs for logging
 * @param {Object|Array} workLogs - Work logs data
 * @param {string} action - Action description
 * @returns {Object} Safe data for logging
 */
export const safeLogWorkLogs = (workLogs, action = 'work_logs') => {
  if (!workLogs) {
    return { action, status: 'no_data' };
  }

  const isArray = Array.isArray(workLogs);
  const logs = isArray ? workLogs : workLogs.results || [workLogs];

  const safeData = {
    action,
    count: workLogs.count || logs.length,
    has_data: logs.length > 0,
  };

  if (logs.length > 0) {
    const firstLog = logs[0];

    // Safe metadata without exact coordinates and IDs
    safeData.sample = {
      hasCheckIn: !!firstLog.check_in,
      hasCheckOut: !!firstLog.check_out,
      status: firstLog.status,
      duration: firstLog.duration,
      totalHours: firstLog.total_hours,
      employeeName: firstLog.employee_name ? maskName(firstLog.employee_name) : 'unknown',
      locationCheckIn: firstLog.location_check_in
        ? maskLocationString(firstLog.location_check_in)
        : null,
      locationCheckOut: firstLog.location_check_out
        ? maskLocationString(firstLog.location_check_out)
        : null,
      hasWorklogId: !!firstLog.id,
    };

    // Statistics without sensitive data
    const completedCount = logs.filter(log => log.check_out).length;
    const activeCount = logs.filter(log => !log.check_out).length;

    safeData.stats = {
      completed: completedCount,
      active: activeCount,
      total: logs.length,
    };
  }

  return safeData;
};

/**
 * Masks location string containing coordinates
 * @param {string} locationString - String like "Office (32.050938, 34.781841)"
 * @returns {string} Generalized location
 */
export const maskLocationString = locationString => {
  if (!locationString) {
    return 'Location Unknown';
  }

  // Extract coordinates from string like "Office (32.050938, 34.781841)"
  const coordRegex = /\(([^,]+),\s*([^)]+)\)/;
  const match = locationString.match(coordRegex);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    return maskCoordinates(lat, lng);
  }

  // If no coordinates, return only name without coordinates
  return locationString.replace(/\s*\([^)]*\)/, '').trim() || 'Location Unknown';
};

/**
 * Creates safe representation of API response for logging
 * @param {Object} apiResponse - API response
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Safe data for logging
 */
export const safeLogApiResponse = (apiResponse, endpoint = 'unknown_api') => {
  if (!apiResponse) {
    return { endpoint, status: 'no_response' };
  }

  const safeData = {
    endpoint,
    has_data: !!apiResponse,
    is_array: Array.isArray(apiResponse),
  };

  if (Array.isArray(apiResponse)) {
    safeData.item_count = apiResponse.length;
    if (apiResponse.length > 0) {
      const firstItem = apiResponse[0];
      safeData.first_item_keys = Object.keys(firstItem || {})
        .filter(
          key =>
            !['email', 'salary', 'pay', 'earnings', 'hourly_rate', 'total'].some(sensitive =>
              key.toLowerCase().includes(sensitive)
            )
        )
        .slice(0, 5); // Only first 5 safe keys
    }
  } else {
    safeData.response_keys = Object.keys(apiResponse)
      .filter(
        key =>
          !['email', 'salary', 'pay', 'earnings', 'hourly_rate', 'total'].some(sensitive =>
            key.toLowerCase().includes(sensitive)
          )
      )
      .slice(0, 5); // Only first 5 safe keys
  }

  return safeData;
};

/**
 * Creates a safe representation of the employees list for logging
 * @param {Object} employeesResponse - API response with employees list
 * @returns {Object} Safe data for logging
 */
export const safeLogEmployeesList = employeesResponse => {
  if (!employeesResponse) {
    return { employees: 'no_response' };
  }

  const safeData = {
    count: employeesResponse.count || 0,
    has_next: !!employeesResponse.next,
    has_previous: !!employeesResponse.previous,
    result_count: employeesResponse.results?.length || 0,
  };

  if (employeesResponse.results && employeesResponse.results.length > 0) {
    // Role statistics
    const roleStats = {};
    const statusStats = {};
    const employmentStats = {};

    employeesResponse.results.forEach(emp => {
      const role = emp.role || 'unknown';
      const status = emp.is_active ? 'active' : 'inactive';
      const empType = emp.employment_type || 'unknown';

      roleStats[role] = (roleStats[role] || 0) + 1;
      statusStats[status] = (statusStats[status] || 0) + 1;
      employmentStats[empType] = (employmentStats[empType] || 0) + 1;
    });

    safeData.role_distribution = roleStats;
    safeData.status_distribution = statusStats;
    safeData.employment_type_distribution = employmentStats;

    // Biometric data (statistics only)
    const biometricStats = {
      has_biometric: 0,
      no_biometric: 0,
      pending_invites: 0,
      registered: 0,
    };

    employeesResponse.results.forEach(emp => {
      if (emp.has_biometric) biometricStats.has_biometric++;
      else biometricStats.no_biometric++;

      if (emp.has_pending_invitation) biometricStats.pending_invites++;
      if (emp.is_registered) biometricStats.registered++;
    });

    safeData.biometric_stats = biometricStats;
  }

  return safeData;
};

/**
 * Safe wrapper for console.error
 * @param {string} message - Error message
 * @param {Object} error - Error object
 */
export const safeLogError = (message, error = {}) => {
  const safeError = {
    message: error.message || 'Unknown error',
    code: error.code || error.status || 'unknown',
    // DON'T log stack trace in production
    ...(__DEV__ && error.stack ? { stack: error.stack } : {}),
  };

  console.error(message, safeError);
};

// Usage examples:
/*
// Instead of:
console.log('User data loaded:', userData.email);

// Use:
safeLog('User data loaded:', safeLogUser(userData, 'data_loaded'));

// Instead of:
console.log('Location obtained:', {
  lat: currentLocation.coords.latitude.toFixed(6),
  lng: currentLocation.coords.longitude.toFixed(6)
});

// Use:
safeLog('Location obtained:', {
  location: safeLogLocation(
    currentLocation.coords.latitude,
    currentLocation.coords.longitude
  ),
  accuracy: currentLocation.coords.accuracy
});

// Instead of:
console.log('Creating employee:', employeeData);

// Use:
safeLog('Creating employee:', safeLogEmployee(employeeData, 'creation'));
*/
