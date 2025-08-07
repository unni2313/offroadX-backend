const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const router = express.Router()

const SECRET_KEY = 'mudichidallamaa'

router.post('/', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Check if user is currently blocked
    if (user.isBlocked && user.blockExpiry && new Date() < user.blockExpiry) {
      const remainingTime = Math.ceil((user.blockExpiry - new Date()) / (1000 * 60)) // minutes
      return res.status(423).json({ 
        error: `Account is blocked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`,
        blockedUntil: user.blockExpiry
      })
    }

    // If block has expired, reset the block status
    if (user.isBlocked && user.blockExpiry && new Date() >= user.blockExpiry) {
      user.isBlocked = false
      user.blockExpiry = null
      user.failedLoginAttempts = 0
      await user.save()
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1

      // Block user after 4 failed attempts
      if (user.failedLoginAttempts >= 4) {
        user.isBlocked = true
        user.blockExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
        await user.save()
        
        return res.status(423).json({ 
          error: 'Account blocked due to 4 failed login attempts. Try again in 4 hours.',
          blockedUntil: user.blockExpiry
        })
      }

      await user.save()
      const remainingAttempts = 4 - user.failedLoginAttempts
      return res.status(401).json({ 
        error: `Invalid email or password. ${remainingAttempts} attempts remaining before account is blocked.`
      })
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0
      user.isBlocked = false
      user.blockExpiry = null
      await user.save()
    }

    const token = jwt.sign({ 
      id: user._id,
      email: user.email, 
      firstName: user.firstName,
      role: user.role 
    }, SECRET_KEY, {
      expiresIn: '1h',
    })

    res.json({
      message: 'Login successful',
      user: { 
        firstName: user.firstName,
        secondName: user.secondName,
        email: user.email,
        role: user.role
      },
      token,
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
