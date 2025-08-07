require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const registerRoute = require('./register')
const loginRoute = require('./login')
const eventsRoute = require('./events'); // ✅ Add this line
const otpRoute = require('./routes/otp'); // ✅ Add OTP route
const passwordResetRoute = require('./routes/passwordReset'); // ✅ Add password reset route
const adminRoute = require('./routes/admin'); // ✅ Add admin route

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json()) // For parsing JSON bodies


// ✅ Connect to MongoDB
mongoose
  .connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err))

// ✅ Mount routes
app.use('/api/register', registerRoute)
app.use('/api/login', loginRoute)
app.use('/api/events', eventsRoute); // ✅ Add this line
app.use('/api/otp', otpRoute); // ✅ Add OTP route
app.use('/api/password', passwordResetRoute); // ✅ Add password reset route
app.use('/api/admin', adminRoute); // ✅ Add admin route

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Node.js backend!' })
})

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})