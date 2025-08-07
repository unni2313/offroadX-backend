require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'user@offroadx.com' });
    
    if (existingUser) {
      console.log('Test user already exists');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      mongoose.disconnect();
      return;
    }

    // Create regular user
    const hashedPassword = await bcrypt.hash('user123', 10);
    
    const testUser = new User({
      firstName: 'John',
      secondName: 'Explorer',
      email: 'user@offroadx.com',
      phone: '+1987654321',
      password: hashedPassword,
      role: 'user',
      isEmailVerified: true
    });

    await testUser.save();
    
    console.log('✅ Test user created successfully!');
    console.log('Email: user@offroadx.com');
    console.log('Password: user123');
    console.log('Role: user');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();