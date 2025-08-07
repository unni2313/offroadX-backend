// server/models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: String,
  date: String,
  time: String,
  location: String,
  maxParticipants: Number,
  difficulty: String,
  duration: String,
  description: String,
  participants: { type: Number, default: 0 },
  status: { type: String, default: 'upcoming' }
});

module.exports = mongoose.model('Event', eventSchema);
