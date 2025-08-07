const express = require('express');
const jwt = require('jsonwebtoken');
const { unblockUser, getUserBlockStatus, resetFailedAttempts } = require('../utils/accountSecurity');
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

module.exports = router;