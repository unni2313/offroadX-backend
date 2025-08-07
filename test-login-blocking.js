const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'correctpassword',
  wrongPassword: 'wrongpassword'
};

async function testLoginBlocking() {
  console.log('🧪 Testing Login Blocking Mechanism\n');

  try {
    // Test 1: Try 4 failed login attempts
    console.log('📝 Test 1: Attempting 4 failed logins...');
    
    for (let i = 1; i <= 4; i++) {
      try {
        const response = await axios.post(`${BASE_URL}/login`, {
          email: testUser.email,
          password: testUser.wrongPassword
        });
      } catch (error) {
        console.log(`   Attempt ${i}: ${error.response?.data?.error || error.message}`);
      }
    }

    // Test 2: Try to login after being blocked
    console.log('\n📝 Test 2: Attempting login after being blocked...');
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        email: testUser.email,
        password: testUser.password
      });
    } catch (error) {
      console.log(`   Blocked login attempt: ${error.response?.data?.error || error.message}`);
      if (error.response?.data?.blockedUntil) {
        console.log(`   Blocked until: ${new Date(error.response.data.blockedUntil).toLocaleString()}`);
      }
    }

    // Test 3: Check user status (requires admin token)
    console.log('\n📝 Test 3: Checking user block status...');
    console.log('   Note: This requires admin authentication. Create an admin user first.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testSuccessfulLoginAfterBlock() {
  console.log('\n🧪 Testing Successful Login After Block Expiry\n');
  
  try {
    // This would need to wait 4 hours or manually unblock the user
    console.log('📝 To test successful login after block expiry:');
    console.log('   1. Wait 4 hours, OR');
    console.log('   2. Use admin API to unblock the user, OR');
    console.log('   3. Manually reset the user in the database');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to create a test user (if needed)
async function createTestUser() {
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      firstName: 'Test',
      secondName: 'User',
      email: testUser.email,
      phone: '1234567890',
      password: testUser.password
    });
    console.log('✅ Test user created successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️  Test user already exists');
    } else {
      console.log('❌ Failed to create test user:', error.response?.data?.error || error.message);
    }
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting Login Blocking Tests\n');
  
  // First, ensure test user exists
  await createTestUser();
  
  // Run the blocking tests
  await testLoginBlocking();
  await testSuccessfulLoginAfterBlock();
  
  console.log('\n✅ Tests completed!');
  console.log('\n📋 Summary of implemented features:');
  console.log('   • Failed login attempts are tracked');
  console.log('   • Account is blocked after 4 failed attempts');
  console.log('   • Block lasts for 4 hours');
  console.log('   • Users see remaining attempts before block');
  console.log('   • Block status includes remaining time');
  console.log('   • Successful login resets failed attempts');
  console.log('   • Admin can manually unblock accounts');
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testLoginBlocking,
  createTestUser,
  testUser
};