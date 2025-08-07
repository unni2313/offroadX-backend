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

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign({ 
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
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
