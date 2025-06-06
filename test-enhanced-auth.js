// test-enhanced-auth.js
// Quick test script for enhanced authentication

const axios = require('axios');

const API_URL = 'http://192.168.1.164:8000';

const testEnhancedAuth = async () => {
  try {
    console.log('🧪 Testing Enhanced Authentication Integration...\n');
    
    // Test device info generation (simulated)
    const deviceInfo = {
      platform: 'test',
      os_version: '1.0',
      app_version: '1.0.0',
      device_model: 'Test Device',
      device_id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('📱 Device Info:', {
      deviceId: deviceInfo.device_id.substring(0, 8) + '...',
      platform: deviceInfo.platform
    });
    
    // Test 1: Enhanced Login
    console.log('\n1️⃣ Testing Enhanced Login...');
    const loginResponse = await axios.post(`${API_URL}/api/v1/users/auth/enhanced-login/`, {
      email: 'admin@example.com',
      password: 'admin123',
      device_id: deviceInfo.device_id,
      device_info: deviceInfo,
      location: {
        latitude: 32.050939,
        longitude: 34.781791,
        accuracy: 10
      }
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Enhanced login successful!');
      console.log('  - Token expires:', new Date(loginResponse.data.expires_at).toLocaleString());
      console.log('  - User role:', loginResponse.data.user.role);
      console.log('  - Biometric registered:', loginResponse.data.biometric_registered);
      console.log('  - Requires biometric verification:', loginResponse.data.security_info.requires_biometric_verification);
      
      const deviceToken = loginResponse.data.token;
      
      // Test 2: Check Work Status with Device Token
      console.log('\n2️⃣ Testing Work Status Check...');
      try {
        const statusResponse = await axios.get(`${API_URL}/api/v1/biometrics/status/`, {
          headers: {
            'Authorization': `DeviceToken ${deviceToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Work status check successful!');
        console.log('  - Is checked in:', statusResponse.data.is_checked_in);
        console.log('  - Employee name:', statusResponse.data.employee_info?.employee_name);
        
      } catch (statusError) {
        console.log('❌ Work status check failed:', statusError.response?.data || statusError.message);
      }
      
      // Test 3: Token Refresh
      console.log('\n3️⃣ Testing Token Refresh...');
      try {
        const refreshResponse = await axios.post(`${API_URL}/api/v1/users/auth/refresh-token/`, {
          ttl_days: 7
        }, {
          headers: {
            'Authorization': `DeviceToken ${deviceToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (refreshResponse.data.success) {
          console.log('✅ Token refresh successful!');
          console.log('  - New token expires:', new Date(refreshResponse.data.expires_at).toLocaleString());
        }
        
      } catch (refreshError) {
        console.log('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
      }
      
      // Test 4: Logout Device
      console.log('\n4️⃣ Testing Device Logout...');
      try {
        const logoutResponse = await axios.post(`${API_URL}/api/v1/users/auth/logout-device/`, {}, {
          headers: {
            'Authorization': `DeviceToken ${deviceToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (logoutResponse.data.success) {
          console.log('✅ Device logout successful!');
          console.log('  - Logged out at:', new Date(logoutResponse.data.logged_out_at).toLocaleString());
        }
        
      } catch (logoutError) {
        console.log('❌ Device logout failed:', logoutError.response?.data || logoutError.message);
      }
      
    } else {
      console.log('❌ Enhanced login failed');
    }
    
    console.log('\n🎉 Enhanced Authentication Integration Test Complete!');
    
  } catch (error) {
    console.error('💥 Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};

// Run the test
testEnhancedAuth();