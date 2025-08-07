require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
  try {
    await mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0');
    
    const user = await User.findOne({ email: 'fsmusicx@gmail.com' });
    
    if (user) {
      console.log('User found:');
      console.log('Email:', user.email);
      console.log('First Name:', user.firstName);
      console.log('Is Email Verified:', user.isEmailVerified);
      console.log('Has OTP:', !!user.otp);
      console.log('OTP Expiry:', user.otpExpiry);
      console.log('Created At:', user.createdAt);
      
      // Delete the test user to reset
      await User.deleteOne({ email: 'fsmusicx@gmail.com' });
      console.log('\n✅ Test user deleted - ready for fresh testing');
    } else {
      console.log('No user found with email: fsmusicx@gmail.com');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();