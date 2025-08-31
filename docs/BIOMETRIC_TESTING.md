# Biometric Testing Guide

## Testing the Biometric System

This documentation describes how to test the MyHours biometric system.

## What's Already Implemented

**Frontend (React Native):**
- Biometric data registration screen (`/biometric-registration`)
- Biometric check-in/check-out screen (`/biometric-check`)
- API service with full biometric operations support
- Token authorization and user management
- Camera integration (Expo Camera)
- Geolocation processing (office/remote)

**Backend (Django):**
- Biometric API endpoints
- Token authentication system
- Models for storing biometric data
- MongoDB integration for faces

## Quick Testing Start

### 1. Backend Connection Test

```bash
# In the React Native application directory
npm run test:biometric
```

This script will check:
- Connection to Django API
- User authorization
- Biometric data registration
- Check-in/Check-out operations

### 2. UI Testing in the App

1. Start the React Native application:
```bash
npm start
```

2. On the login screen, click **"Test Biometric Flow""

3. The test will verify:
   - User authentication
   - API connection
   - Mock biometric operations
   - Office configuration

### 3. Testing Real UI Screens

From the test screen you can navigate to:
- **Test Registration UI** - face registration screen
- **Test Check-In UI** - check-in screen
- **Test Check-Out UI** - check-out screen

## Configuration

### API Configuration

In the `src/config.js` file, make sure that:

```javascript
export const API_URL = 'http://192.168.1.100:8000';  // Your Django server
export const APP_CONFIG = {
  ENABLE_MOCK_DATA: true,  // true for testing without backend
  // ...
};
```

### Django Backend

1. Start the Django server:
```bash
cd backend/myhours-backend
python manage.py runserver 0.0.0.0:8000
```

2. Create a superuser if needed:
```bash
python manage.py createsuperuser
```

## Testing Modes

### Mock Mode (ENABLE_MOCK_DATA: true)
- Uses mock data
- Doesn't require backend connection
- Ideal for UI testing

### Real API Mode (ENABLE_MOCK_DATA: false)
- Connects to real Django backend
- Requires running Django server
- Full end-to-end testing

## Troubleshooting

### Connection Issues

1. **"Connection failed":**
   - Check that Django server is running
   - Ensure IP address in config.js is correct
   - Check firewall settings

2. **"Camera permission denied":**
   - Allow camera access in device settings
   - Restart the application

3. **"Authentication failed":**
   - Check user credentials
   - Create user in Django admin

### Mock Data Not Working

- Ensure `ENABLE_MOCK_DATA: true` in config.js
- Restart the application

## Testing Status

| Component | Status | Notes |
|-----------|--------|-------|
| API Service | Ready | Full biometric operations support |
| Authorization | Ready | Token system works |
| UI Registration | Ready | Face registration screen |
| UI Check-in/out | Ready | Check-in/out screens |
| Camera | Ready | Expo Camera integration |
| Geolocation | Ready | Office/remote detection |
| End-to-end | Ready | Complete workflow |

## Next Steps

1. **Real testing:** Test with real Django backend
2. **Production readiness:** Disable mock mode for production
3. **Additional tests:** Add unit tests if necessary

## Support

If you encounter issues:
1. Check logs in React Native console
2. Check Django server logs
3. Ensure all dependencies are installed
4. Try mock mode first, then real API mode