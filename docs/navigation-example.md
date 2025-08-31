# Improved Navigation for Biometric Registration

## Overview
The biometric registration component now supports flexible navigation using the `returnTo` parameter, making it more reusable and reliable.

## Usage Examples

### 1. From Team Management (Admin)
```javascript
router.push({
  pathname: '/biometric-registration',
  params: {
    employeeId: '31',
    employeeName: 'John Doe',
    returnTo: '/team-management'
  }
});
```

### 2. From Employee Dashboard (Self-service)
```javascript
router.push({
  pathname: '/biometric-registration',
  params: {
    employeeId: userId,
    employeeName: userName,
    returnTo: '/employees'
  }
});
```

### 3. From Custom Screen
```javascript
router.push({
  pathname: '/biometric-registration',
  params: {
    employeeId: '31',
    employeeName: 'John Doe',
    returnTo: '/custom-employee-screen'
  }
});
```

### 4. Legacy Support (Backward Compatibility)
```javascript
// Still works with old selfService parameter
router.push({
  pathname: '/biometric-registration',
  params: {
    employeeId: '31',
    employeeName: 'John Doe',
    selfService: 'true'  // Falls back to /employees
  }
});
```

## Priority Order
1. **returnTo** parameter (highest priority)
2. **selfService** parameter (legacy fallback)
3. **/team-management** (default fallback)

## Benefits
- **Explicit navigation**: Clear intent where to return
- **Reusable component**: Can be called from any screen
- **Backward compatible**: Existing code still works
- **Reliable**: No dependency on navigation stack
- **Debuggable**: Clear logging of navigation decisions