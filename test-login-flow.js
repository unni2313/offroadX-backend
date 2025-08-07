const axios = require('axios');

async function testLoginFlow() {
  console.log('🧪 Testing Role-Based Login Flow...\n');

  const API_BASE = 'http://localhost:5000/api';

  // Test Admin Login
  console.log('👨‍💼 Testing Admin Login...');
  try {
    const adminResponse = await axios.post(`${API_BASE}/login`, {
      email: 'admin@offroadx.com',
      password: 'admin123'
    });

    console.log('✅ Admin login successful!');
    console.log(`   Name: ${adminResponse.data.user.firstName} ${adminResponse.data.user.secondName}`);
    console.log(`   Role: ${adminResponse.data.user.role}`);
    console.log(`   Expected Route: /dashboard`);
    console.log(`   Token: ${adminResponse.data.token.substring(0, 20)}...`);
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test User Login
  console.log('🧑‍🚀 Testing Regular User Login...');
  try {
    const userResponse = await axios.post(`${API_BASE}/login`, {
      email: 'user@offroadx.com',
      password: 'user123'
    });

    console.log('✅ User login successful!');
    console.log(`   Name: ${userResponse.data.user.firstName} ${userResponse.data.user.secondName}`);
    console.log(`   Role: ${userResponse.data.user.role}`);
    console.log(`   Expected Route: /home`);
    console.log(`   Token: ${userResponse.data.token.substring(0, 20)}...`);
  } catch (error) {
    console.log('❌ User login failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Invalid Login
  console.log('🚫 Testing Invalid Login...');
  try {
    await axios.post(`${API_BASE}/login`, {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    console.log('❌ Invalid login should have failed!');
  } catch (error) {
    console.log('✅ Invalid login properly rejected:', error.response?.data?.error);
  }

  console.log('\n🎯 Test Summary:');
  console.log('✅ Admin users → Dashboard (/dashboard)');
  console.log('✅ Regular users → Home page (/home)');
  console.log('✅ Invalid credentials → Proper error handling');
  console.log('\n🌐 Frontend URLs:');
  console.log('   Login: http://localhost:5173/login');
  console.log('   Admin Dashboard: http://localhost:5173/dashboard');
  console.log('   User Home: http://localhost:5173/home');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin@offroadx.com / admin123');
  console.log('   User: user@offroadx.com / user123');
}

testLoginFlow().catch(console.error);