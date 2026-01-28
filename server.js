require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const registerRoute = require('./register')
const loginRoute = require('./login')
const eventsRoute = require('./routes/events'); // ✅ Updated to use new events route
const otpRoute = require('./routes/otp'); // ✅ Add OTP route
const passwordResetRoute = require('./routes/passwordReset'); // ✅ Add password reset route
const adminRoute = require('./routes/admin'); // ✅ Add admin route
const profileRoute = require('./routes/profile');

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
app.use('/api/profile', profileRoute);

// 🚗 Vehicles routes
const vehiclesRoute = require('./routes/vehicles');
app.use('/api/vehicles', vehiclesRoute);

// 🛤️ Routes (trail routes) routes
const routesRoute = require('./routes/routes');
app.use('/api/routes', routesRoute);

// 🏁 Races routes
const racesRoute = require('./routes/races');
app.use('/api/races', racesRoute);

const ecommerceRoute = require('./routes/ecommerce');
app.use('/api/ecommerce', ecommerceRoute);

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Node.js backend!' })
})

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    storage: 'ok' // Assuming storage is working if the server is running
  }
  res.json(healthStatus)
})

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})

// this going to work