const mongoose = require('mongoose');

const checkpointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  }
});

const stageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  checkpoints: [checkpointSchema]
});

const raceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['lap', 'rally', 'time_trial']
  },
  // Type-specific fields
  numberOfLaps: {
    type: Number,
    min: 1,
    required: function() {
      return this.type === 'lap';
    }
  },
  stages: [stageSchema], // For rally type
  // Common fields
  date: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  maxParticipants: {
    type: Number,
    min: 1,
    default: function() {
      // Could inherit from route or event, but for now default
      return 20;
    }
  },
  description: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
raceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
raceSchema.index({ event: 1, status: 1 });
raceSchema.index({ route: 1 });
raceSchema.index({ type: 1 });
raceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Race', raceSchema);