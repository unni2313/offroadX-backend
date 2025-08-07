require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@offroadx.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      mongoose.disconnect();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      firstName: 'Admin',
      secondName: 'User',
      email: 'admin@offroadx.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@offroadx.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdmin();