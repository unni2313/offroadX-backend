const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
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
  },
  order: {
    type: Number,
    required: true
  }
});

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedTime: {
    type: String,
    required: true
  },
  terrain: {
    type: String,
    required: true,
    enum: ['Rocky', 'Muddy', 'Sandy', 'Forest', 'Desert', 'Mountain', 'Mixed']
  },
  startLocation: {
    type: String,
    required: true
  },
  startCoordinates: {
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  },
  endLocation: {
    type: String,
    required: true
  },
  endCoordinates: {
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  },
  waypoints: [waypointSchema],
  safetyNotes: {
    type: String
  },
  requiredVehicleType: {
    type: String,
    required: true,
    enum: ['Any', 'ATV', 'UTV', 'Dirt Bike', '4x4 Truck', 'Jeep'],
    default: 'Any'
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 20
  },
  isActive: {
    type: Boolean,
    default: true
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
routeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
routeSchema.index({ difficulty: 1, terrain: 1, isActive: 1 });
routeSchema.index({ createdBy: 1 });
routeSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Route', routeSchema);