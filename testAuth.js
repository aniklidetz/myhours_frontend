// Simple authentication test
const fetch = require('node-fetch');

const testAuth = async () => {
  console.log('=== Testing Authentication ===');
  
  // Test 1: No auth
  console.log('\n1. Testing without auth...');
  try {
    const response = await fetch('http://localhost:8000/api/v1/biometrics/status/');
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test 2: Try to login and get token
  console.log('\n2. Testing login...');
  try {
    const loginResponse = await fetch('http://localhost:8000/api/v1/users/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      }),
    });
    
    const loginData = await loginResponse.json();
    console.log(`Login Status: ${loginResponse.status}`);
    console.log(`Login Response:`, loginData);
    
    if (loginData.token) {
      // Test 3: Use token
      console.log('\n3. Testing with token...');
      const authResponse = await fetch('http://localhost:8000/api/v1/biometrics/status/', {
        headers: {
          'Authorization': `Token ${loginData.token}`,
        },
      });
      
      const authData = await authResponse.json();
      console.log(`Auth Status: ${authResponse.status}`);
      console.log(`Auth Response:`, authData);
    }
  } catch (error) {
    console.log('Login Error:', error.message);
  }
};

testAuth();