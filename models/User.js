const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  secondName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  isEmailVerified: { type: Boolean, default: false },

  // ➕ Add these fields for password reset
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  
  // ➕ Add these fields for OTP verification
  otp: { type: String },
  otpExpiry: { type: Date },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
