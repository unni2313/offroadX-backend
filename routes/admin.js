const express = require('express');
const jwt = require('jsonwebtoken');
const { unblockUser, getUserBlockStatus, resetFailedAttempts } = require('../utils/accountSecurity');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');
const cloudinary = require('../utils/cloudinary');
const router = express.Router();

const SECRET_KEY = 'mudichidallamaa';

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user block status
router.get('/user-status/:email', verifyAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await getUserBlockStatus(email);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock a user account
router.post('/unblock-user', verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await unblockUser(email);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset failed login attempts
router.post('/reset-attempts', verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await resetFailedAttempts(email);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error resetting attempts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List users excluding admins with filters
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { role, verified, stats } = req.query; // optional filters
    const match = { role: { $ne: 'admin' } };
    if (role) match.role = role;
    if (verified === 'true') match.isEmailVerified = true;
    if (verified === 'false') match.isEmailVerified = false;

    if (stats === 'true') {
      // Aggregated with vehicle count and license doc flag
      const users = await User.aggregate([
        { $match: match },
        { $lookup: { from: 'vehicles', localField: '_id', foreignField: 'user', as: 'vehicles' } },
        { $addFields: {
          vehicleCount: { $size: '$vehicles' },
          hasLicenseDoc: { $gt: [{ $strLenCP: { $ifNull: ['$licenseDocUrl', ''] } }, 0] }
        } },
        { $project: {
          password: 0, resetToken: 0, resetTokenExpiry: 0, otp: 0, otpExpiry: 0,
          vehicles: 0
        } },
        { $sort: { createdAt: -1 } }
      ]);
      return res.json(users);
    }

    // Simple list without stats
    const users = await User.find(match)
      .select('-password -resetToken -resetTokenExpiry -otp -otpExpiry')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user (admin edit)
router.put('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'firstName','secondName','email','phone','role','isEmailVerified','dob','drivingLicenseNumber'
    ];
    const update = {};
    for (const key of allowed) {
      if (key in req.body) update[key] = req.body[key];
    }
    const updated = await User.findByIdAndUpdate(id, update, { new: true })
      .select('-password -resetToken -resetTokenExpiry -otp -otpExpiry');
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user (admin view), optional stats=true
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { stats } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (stats === 'true') {
      const users = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        { $lookup: { from: 'vehicles', localField: '_id', foreignField: 'user', as: 'vehicles' } },
        { $addFields: {
          vehicleCount: { $size: '$vehicles' },
          hasLicenseDoc: { $gt: [{ $strLenCP: { $ifNull: ['$licenseDocUrl', ''] } }, 0] }
        } },
        { $project: {
          password: 0, resetToken: 0, resetTokenExpiry: 0, otp: 0, otpExpiry: 0,
          vehicles: 0
        } }
      ]);
      if (!users.length) return res.status(404).json({ error: 'User not found' });
      return res.json(users[0]);
    }

    const user = await User.findById(id).select('-password -resetToken -resetTokenExpiry -otp -otpExpiry');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List vehicles for a specific user (admin view, read-only)
router.get('/users/:id/vehicles', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const vehicles = await Vehicle.find({ user: id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get direct license URL for a user's license (admin)
router.get('/users/:id/license/url', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
    const user = await User.findById(id).select('licenseDocUrl');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.licenseDocUrl) return res.status(404).json({ error: 'No license document' });
    return res.json({ url: user.licenseDocUrl });
  } catch (error) {
    console.error('Error generating admin license URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

module.exports = router;