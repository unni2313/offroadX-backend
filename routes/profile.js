
const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verify-token');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyToken, async (req, res) => {
  try {
    const { firstName, secondName, email, phone, currentPassword, newPassword } = req.body;
    
    // Basic validation
    if (!firstName || !secondName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Password validation if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      // Get user with password to verify current password
      const userWithPassword = await User.findById(req.user.id);
      if (!userWithPassword) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.user.id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    // Prepare update data
    const updateData = {
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      updatedAt: new Date()
    };

    // Hash new password if provided
    if (newPassword) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(newPassword, saltRounds);
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
