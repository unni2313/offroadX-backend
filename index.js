const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const loginRoute = require('./login')

const app = express()
const PORT = 5000

app.use(cors())
app.use(bodyParser.json())

mongoose
  .connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0 ', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

app.use('/api', loginRoute)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
const registerRoute = require('./register')
app.use('/api', registerRoute)
