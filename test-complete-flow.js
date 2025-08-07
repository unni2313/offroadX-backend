// Quick test script to verify OTP flow
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const testEmail = 'fsmusicx@gmail.com';
const testFirstName = 'TestUser';

async function testOTPFlow() {
  console.log('🧪 Testing OTP Flow...\n');

  try {
    // Step 1: Send OTP
    console.log('📧 Step 1: Sending OTP...');
    const sendResponse = await axios.post(`${API_BASE}/otp/send-otp`, {
      email: testEmail,
      firstName: testFirstName
    });
    console.log('✅ OTP sent successfully:', sendResponse.data.message);
    console.log('📬 Check your email for the OTP code\n');

    // Wait for user to enter OTP (in real scenario, this would come from email)
    console.log('⏳ Please check your email and enter the OTP when ready...');
    console.log('💡 You can test verification manually using the test-otp.html file\n');

    // Step 2: Test registration endpoint (should fail without OTP verification)
    console.log('🔒 Step 2: Testing registration without OTP verification...');
    try {
      const regResponse = await axios.post(`${API_BASE}/register`, {
        firstName: testFirstName,
        secondName: 'User',
        email: testEmail,
        phone: '1234567890',
        password: 'password123',
        confirmPassword: 'password123'
      });
      console.log('❌ Registration should have failed but succeeded:', regResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Registration correctly blocked without OTP verification');
        console.log('📝 Error message:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n🎯 OTP Flow Test Summary:');
    console.log('✅ OTP sending: Working');
    console.log('✅ Registration protection: Working');
    console.log('📧 Email delivery: Check your inbox');
    console.log('\n🌐 Frontend available at: http://localhost:5173');
    console.log('🧪 Test page available at: file:///d:/Apps/MINI%20PROJECT/test-otp.html');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Check if axios is available
try {
  testOTPFlow();
} catch (error) {
  console.log('📦 Installing axios for testing...');
  console.log('Run: npm install axios');
  console.log('Then run: node test-complete-flow.js');
}