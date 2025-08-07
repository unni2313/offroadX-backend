const express = require('express')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const router = express.Router()

router.post('/', async (req, res) => {
  const { firstName, secondName, email, phone, password, confirmPassword } = req.body

  if (!firstName || !secondName || !email || !phone || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' })
  }

  try {
    const existingUser = await User.findOne({ email })
    
    // Check if user exists and email is verified - allow registration completion
    if (existingUser && existingUser.isEmailVerified) {
      // Update the existing user with complete registration data
      const hashedPassword = await bcrypt.hash(password, 10)
      
      existingUser.firstName = firstName
      existingUser.secondName = secondName
      existingUser.phone = phone
      existingUser.password = hashedPassword
      existingUser.role = 'user'
      
      await existingUser.save()
      
      return res.status(201).json({ 
        message: 'Registration completed successfully!',
        success: true
      })
    }
    
    // Check if user exists but email is not verified
    if (existingUser && !existingUser.isEmailVerified) {
      return res.status(400).json({ 
        error: 'Please verify your email first before completing registration.',
        needsVerification: true 
      })
    }
    // If no user exists, they need to start with OTP verification first
    return res.status(400).json({ 
      error: 'Please verify your email first before completing registration.',
      needsVerification: true 
    })
    
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
