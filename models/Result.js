const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  race: { type: mongoose.Schema.Types.ObjectId, ref: 'Race', required: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  score: { type: Number, default: 0 },
  finishingTimeMs: { type: Number, default: 0 }, // store as milliseconds
  position: { type: Number },
  notes: { type: String, trim: true },
}, { timestamps: true });

resultSchema.index({ event: 1, race: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);

