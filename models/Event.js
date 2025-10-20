// server/models/Event.js
const mongoose = require('mongoose');

const guidelineItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  required: { type: Boolean, default: false }
}, { _id: false });

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
  status: { type: String, default: 'upcoming' },
  guidelines: {
    text: { 
      type: String, 
      default: 'Please ensure you have proper safety equipment, valid driver\'s license, and a well-maintained vehicle. Review the route carefully and arrive 30 minutes before the start time.' 
    },
    checklistItems: {
      type: [guidelineItemSchema],
      default: [
        { item: 'Valid driver\'s license', required: true },
        { item: 'Safety helmet', required: true },
        { item: 'Vehicle inspection completed', required: true },
        { item: 'Emergency contact provided', required: true },
        { item: 'Medical clearance (if needed)', required: false }
      ]
    }
  }
});

module.exports = mongoose.model('Event', eventSchema);
