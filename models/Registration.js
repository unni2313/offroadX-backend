const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true, 
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  reviewedAt: { 
    type: Date 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewNotes: { 
    type: String, 
    trim: true 
  },
  // Additional registration details
  vehicles: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle' 
  }],
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  },
  medicalConditions: { 
    type: String, 
    trim: true 
  },
  experienceLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'beginner' 
  },
  additionalNotes: { 
    type: String, 
    trim: true 
  }
}, { 
  timestamps: true 
});

// Compound index to ensure one registration per user per event
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Index for efficient queries
registrationSchema.index({ status: 1, appliedAt: -1 });
registrationSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);