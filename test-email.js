const dotenv = require('dotenv');
const { sendPasswordResetEmail } = require('./utils/emailService');

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('Testing email service...');
  console.log('Environment variables:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Configured' : 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Configured' : 'NOT SET');
  console.log('FORCE_SSL_EMAIL:', process.env.FORCE_SSL_EMAIL || 'false');

  const testEmail = process.env.EMAIL_USER || 'test@example.com';
  const testResetUrl = 'https://offroadx-frontend.onrender.com/reset-password?token=test123';
  const testFirstName = 'Test User';

  console.log('\nTesting with port 587 (STARTTLS)...');
  const result1 = await sendPasswordResetEmail(testEmail, testResetUrl, testFirstName);
  console.log('Result with 587:', result1 ? 'SUCCESS' : 'FAILED');

  if (!result1) {
    console.log('\nTesting with port 465 (SSL) as fallback...');
    process.env.FORCE_SSL_EMAIL = 'true';
    const result2 = await sendPasswordResetEmail(testEmail, testResetUrl, testFirstName);
    console.log('Result with 465:', result2 ? 'SUCCESS' : 'FAILED');
  }
}

// Run the test
testEmail().catch(console.error);