const express = require('express');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../utils/otpService');
const router = express.Router();

// Send OTP for email verification
router.post('/send-otp', async (req, res) => {
  const { email, firstName } = req.body;

  if (!email || !firstName) {
    return res.status(400).json({ error: 'Email and firstName are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({ error: 'Email already registered and verified' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // If user exists but not verified, update OTP
    if (existingUser) {
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      // Create temporary user record with OTP (minimal data for verification)
      const tempUser = new User({
        firstName,
        secondName: 'temp', // Will be updated during registration
        email,
        phone: 'temp', // Will be updated during registration
        password: 'temp', // Will be updated during registration
        otp,
        otpExpiry,
        isEmailVerified: false,
      });
      await tempUser.save();
    }

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, firstName);
    
    if (emailResult.success) {
      res.status(200).json({ 
        message: 'OTP sent successfully to your email',
        email: email 
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP is valid and not expired
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ 
      message: 'Email verified successfully',
      isVerified: true 
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, user.firstName);
    
    if (emailResult.success) {
      res.status(200).json({ 
        message: 'OTP resent successfully to your email' 
      });
    } else {
      res.status(500).json({ error: 'Failed to resend OTP email' });
    }

  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;